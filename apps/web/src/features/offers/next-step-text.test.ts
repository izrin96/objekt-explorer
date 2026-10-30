import { describe, expect, test } from "bun:test";

import { TRADE_EXPIRE_DAYS } from "@repo/api/schemas/offer";

import { type Deadline, type Leg, type NextStep, nextStep } from "./next-step";
import { deadlineText, endedText, noteText, yourTurnText } from "./next-step-text";
import { ACCEPTED, DAY, leg, trade } from "./trade-fixture";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);
const NOW = new Date(ACCEPTED).getTime() + 4 * DAY;
const FORMAT = {
  left: (iso: string) => `L(${iso})`,
  date: (iso: string) => `D(${iso})`,
  until: (iso: string) => `U(${iso})`,
};
const AT = "2026-10-20T12:00:00.000Z";
const nameOf = (l: Leg) => `#${l.serial}`;

describe("endedText", () => {
  const ended = (
    status: "failed" | "cancelled",
    cancelReason: Parameters<typeof endedText>[0]["cancelReason"],
    cancelledByYou: boolean | null = null,
  ) => endedText({ status, cancelReason, cancelledByYou }, "binary.bin");

  test("failed and expired", () => {
    check(ended("failed", "expired")).toBe(
      `Not every transfer was verified within ${TRADE_EXPIRE_DAYS} days. You can report a problem.`,
    );
  });

  test("failed for another reason", () => {
    check(ended("failed", null)).toBe(
      "An objekt went to someone else after a transfer was verified. You can report a problem.",
    );
  });

  test("cancelled because the token moved", () => {
    check(ended("cancelled", "token_moved")).toBe(
      "An objekt left the wallet before any transfer was verified.",
    );
  });

  test("cancelled because the objekt is not transferable", () => {
    check(ended("cancelled", "not_transferable")).toBe(
      "An objekt can no longer be transferred, and nothing had been sent yet.",
    );
  });

  test("cancelled and expired", () => {
    check(ended("cancelled", "expired")).toBe(
      `No transfer was verified within ${TRADE_EXPIRE_DAYS} days.`,
    );
  });

  test("cancelled by you", () => {
    check(ended("cancelled", null, true)).toBe("You cancelled this trade.");
  });

  test("cancelled by them, and by null", () => {
    check(ended("cancelled", null, false)).toBe("binary.bin cancelled this trade.");
    check(ended("cancelled", null, null)).toBe("binary.bin cancelled this trade.");
  });
});

describe("deadlineText", () => {
  const text = (d: Deadline) => deadlineText(d, FORMAT);

  test("ends", () => {
    check(text({ kind: "ends", at: AT })).toEqual({
      label: "Ends",
      value: `in L(${AT})`,
      note: `D(${AT})`,
    });
  });

  test("endsHeld", () => {
    check(text({ kind: "endsHeld", at: AT })).toEqual({
      label: "Ends",
      value: "Paused",
      note: `Was D(${AT})`,
    });
  });

  test("decide", () => {
    check(text({ kind: "decide", at: AT })).toEqual({
      label: "Decide",
      value: `L(${AT}) left`,
      note: `D(${AT})`,
    });
  });

  test("copyLeft", () => {
    check(text({ kind: "copyLeft", at: AT })).toEqual({
      label: "Counts as accepted",
      value: `in L(${AT})`,
      note: `D(${AT})`,
    });
  });

  test("rateBy", () => {
    check(text({ kind: "rateBy", at: AT })).toEqual({
      label: "Rate by",
      value: `D(${AT})`,
      note: "Change it until then",
    });
  });

  test("rateUntil", () => {
    check(text({ kind: "rateUntil", at: AT })).toEqual({
      label: "Change until",
      value: `D(${AT})`,
      note: null,
    });
  });

  test("ended with a date", () => {
    check(text({ kind: "ended", at: AT })).toEqual({
      label: "Ended",
      value: `D(${AT})`,
      note: null,
    });
  });

  test("ended without a date has no deadline", () => {
    check(text({ kind: "ended", at: null })).toBeNull();
  });
});

describe("noteText", () => {
  const away = { breaksAt: AT } as NonNullable<Leg["away"]>;
  const text = (kind: "ownStuck" | "theirStuck" | "ownAway" | "theirAway") =>
    noteText(
      { kind, leg: leg({ away }) },
      { name: "binary.bin", objekt: "A201Z #722", until: FORMAT.until },
    );

  test("ownStuck", () => {
    check(text("ownStuck")).toBe("Your A201Z #722 can't be sent right now");
  });

  test("theirStuck", () => {
    check(text("theirStuck")).toBe("binary.bin's A201Z #722 can't be sent right now.");
  });

  test("ownAway", () => {
    check(text("ownAway")).toBe(
      `Your A201Z #722 left your wallet. Bring it back or send it by U(${AT}), or the trade ends.`,
    );
  });

  test("theirAway", () => {
    check(text("theirAway")).toBe(
      `binary.bin's A201Z #722 left their wallet. The trade ends unless it's back or delivered by U(${AT}).`,
    );
  });

  test("an away note without an away leg has an empty date", () => {
    check(
      noteText(
        { kind: "ownAway", leg: leg() },
        { name: "binary.bin", objekt: "A201Z #722", until: FORMAT.until },
      ),
    ).toBe("Your A201Z #722 left your wallet. Bring it back or send it by , or the trade ends.");
  });
});

describe("yourTurnText", () => {
  const turn = (t: ReturnType<typeof trade>) => {
    const step = nextStep(t, NOW);
    if (step.kind !== "yourTurn") throw new Error(`expected yourTurn, got ${step.kind}`);
    return step as Extract<NextStep, { kind: "yourTurn" }>;
  };

  test("one leg puts its name in the title", () => {
    const step = turn(trade({ legs: [leg({ serial: 722 }), leg({ fromYou: false })] }));
    check(yourTurnText(step, "binary.bin", nameOf)).toEqual({
      title: "Your turn: send #722 to binary.bin",
      body: "It shows as verified here a few minutes after you send it.",
    });
  });

  test("two legs give a count", () => {
    const step = turn(trade({ legs: [leg(), leg(), leg({ fromYou: false })] }));
    check(yourTurnText(step, "binary.bin", nameOf).title).toBe(
      "Your turn: send 2 objekts to binary.bin",
    );
  });

  test("you send first", () => {
    const step = turn(trade({ firstSender: { userId: "p", you: true, sent: false } }));
    check(yourTurnText(step, "binary.bin", nameOf).body).toBe(
      "We suggested you send first. It's a suggestion: nothing stops either of you.",
    );
  });

  test("they send first", () => {
    const step = turn(trade({ firstSender: { userId: "p", you: false, sent: false } }));
    check(yourTurnText(step, "binary.bin", nameOf).body).toBe(
      "We suggested binary.bin sends first. It's a suggestion: nothing stops either of you.",
    );
  });

  test("they sent first and it is your turn", () => {
    const step = turn(trade({ firstSender: { userId: "p", you: false, sent: true } }));
    check(yourTurnText(step, "binary.bin", nameOf).body).toBe(
      "We suggested binary.bin sends first. binary.bin did, so it's your turn.",
    );
  });
});
