import { describe, expect, test } from "bun:test";

import { clockRows, expiryOutcome, firstSenderInClock, historyRows } from "./trade-clock";
import { ACCEPTED, DAY, HOUR, copy, leg, trade, verified } from "./trade-fixture";

const NOW = new Date(ACCEPTED).getTime() + 4 * DAY;
const kinds = (t: ReturnType<typeof trade>, now = NOW) => clockRows(t, now).map((r) => r.kind);

describe("clockRows", () => {
  test("mid-trade order around today", () => {
    const t = trade({
      legs: [
        verified({ verifiedAt: new Date(NOW - 12 * HOUR).toISOString() }),
        leg({ fromYou: false }),
      ],
    });
    expect(kinds(t)).toEqual(["accepted", "reminder", "sent", "today", "report", "ends", "rate"]);
    const rows = clockRows(t, NOW);
    expect(rows.map((r) => r.when)).toEqual([
      "past",
      "past",
      "past",
      "today",
      "future",
      "future",
      "future",
    ]);
  });

  test("a pending copy adds its deadline row", () => {
    const l = leg({
      fromYou: false,
      substitutes: [copy({ acceptBy: new Date(NOW + DAY).toISOString() })],
    });
    expect(kinds(trade({ legs: [leg(), l] }))).toEqual([
      "accepted",
      "reminder",
      "today",
      "copyDue",
      "report",
      "ends",
      "rate",
    ]);
  });

  test("a declined copy or a copy without acceptBy adds no row", () => {
    const l = leg({
      substitutes: [copy({ status: "declined" }), copy({ acceptBy: null })],
    });
    expect(kinds(trade({ legs: [l] }))).not.toContain("copyDue");
  });

  test("the rate row is last and undated", () => {
    const rows = clockRows(trade(), NOW + 30 * DAY);
    expect(rows.at(-1)).toEqual({ kind: "rate", at: null, when: "future" });
  });

  test("rows at one instant keep their order", () => {
    const reminderAt = new Date(ACCEPTED).getTime() + 72 * HOUR;
    expect(kinds(trade(), reminderAt).slice(0, 3)).toEqual(["accepted", "reminder", "today"]);
  });
});

describe("expiryOutcome", () => {
  test("a verified leg fails it", () => {
    expect(expiryOutcome(trade({ legs: [verified(), leg({ fromYou: false })] }))).toBe("failed");
  });

  test("a pending copy on every waiting leg completes it", () => {
    expect(expiryOutcome(trade({ legs: [leg({ substitutes: [copy()] })] }))).toBe("completed");
    expect(
      expiryOutcome(trade({ legs: [verified(), leg({ fromYou: false, substitutes: [copy()] })] })),
    ).toBe("completed");
  });

  test("one transfer pending on two legs fails it", () => {
    const shared = copy();
    expect(
      expiryOutcome(
        trade({
          legs: [leg({ substitutes: [shared] }), leg({ substitutes: [{ ...shared, id: 99 }] })],
        }),
      ),
    ).toBe("failed");
  });

  test("a pending copy with another leg still waiting fails it", () => {
    expect(
      expiryOutcome(trade({ legs: [leg({ substitutes: [copy()] }), leg({ fromYou: false })] })),
    ).toBe("failed");
  });

  test("a declined copy fails it", () => {
    expect(
      expiryOutcome(trade({ legs: [leg({ substitutes: [copy({ status: "declined" })] })] })),
    ).toBe("failed");
  });

  test("nothing sent cancels it", () => {
    expect(expiryOutcome(trade())).toBe("cancelled");
    const ends = clockRows(trade(), NOW).find((r) => r.kind === "ends");
    expect(ends).toMatchObject({ outcome: "cancelled" });
  });
});

describe("firstSenderInClock", () => {
  const first = { userId: "u", you: true, sent: true };
  test("carried in every state but your turn, when both give", () => {
    expect(
      firstSenderInClock(
        trade({ firstSender: first, legs: [verified(), leg({ fromYou: false })] }),
      ),
    ).toBe(true);
    expect(firstSenderInClock(trade({ firstSender: first }))).toBe(false);
  });

  test("not for a one-sided trade, an ended trade or no suggestion", () => {
    expect(firstSenderInClock(trade({ firstSender: first, legs: [leg({ fromYou: false })] }))).toBe(
      false,
    );
    expect(firstSenderInClock(trade({ status: "completed", firstSender: first }))).toBe(false);
    expect(firstSenderInClock(trade({ legs: [verified(), leg({ fromYou: false })] }))).toBe(false);
  });
});

describe("historyRows", () => {
  const sent = (at: string, fromYou: boolean) => verified({ verifiedAt: at, fromYou });

  test("completed: proposed, accepted, transfers by time, completed", () => {
    const rows = historyRows(
      trade({
        status: "completed",
        endedAt: "2026-10-14T00:00:00.000Z",
        legs: [sent("2026-10-13T00:00:00.000Z", false), sent("2026-10-12T00:00:00.000Z", true)],
      }),
    );
    expect(rows.map((r) => r.kind)).toEqual([
      "proposed",
      "accepted",
      "transfer",
      "transfer",
      "end",
    ]);
    expect(rows[2]).toMatchObject({ at: "2026-10-12T00:00:00.000Z" });
    expect(rows.at(-1)).toEqual({
      kind: "end",
      at: "2026-10-14T00:00:00.000Z",
      outcome: "completed",
    });
  });

  test("failed and cancelled end rows", () => {
    expect(
      historyRows(trade({ status: "failed", endedAt: "x", legs: [verified(), leg()] })).at(-1),
    ).toMatchObject({
      outcome: "failed",
    });
    const cancelled = historyRows(trade({ status: "cancelled", endedAt: "y" }));
    expect(cancelled.map((r) => r.kind)).toEqual(["proposed", "accepted", "end"]);
    expect(cancelled.at(-1)).toMatchObject({ outcome: "cancelled", at: "y" });
  });
});
