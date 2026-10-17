import { describe, expect, test } from "bun:test";

import { nextStep, stepKind, timeLeft } from "./next-step";
import { ACCEPTED, DAY, HOUR, copy, leg, trade, verified } from "./trade-fixture";

const NOW = new Date(ACCEPTED).getTime() + 4 * DAY;
const step = (t: ReturnType<typeof trade>) => nextStep(t, NOW);
const ENDS = new Date(new Date(ACCEPTED).getTime() + 14 * DAY).toISOString();

describe("nextStep, ended", () => {
  test("completed, rateable", () => {
    const s = step(
      trade({
        status: "completed",
        legs: [verified(), verified({ fromYou: false })],
        canRate: true,
        rateUntil: "2026-10-30T00:00:00.000Z",
        endedAt: "2026-10-16T00:00:00.000Z",
      }),
    );
    expect(s).toMatchObject({
      kind: "completed",
      canRate: true,
      deadline: { kind: "rateBy", at: "2026-10-30T00:00:00.000Z" },
    });
  });

  test("completed, rated", () => {
    const s = step(
      trade({
        status: "completed",
        legs: [verified(), verified({ fromYou: false })],
        canRate: true,
        rating: "positive",
        rateUntil: "2026-10-30T00:00:00.000Z",
      }),
    );
    expect(s).toMatchObject({ deadline: { kind: "rateUntil", at: "2026-10-30T00:00:00.000Z" } });
  });

  test("completed, window closed", () => {
    const s = step(trade({ status: "completed", endedAt: "2026-09-01T00:00:00.000Z" }));
    expect(s).toMatchObject({
      kind: "completed",
      canRate: false,
      deadline: { kind: "ended", at: "2026-09-01T00:00:00.000Z" },
    });
  });

  test("failed with and without rating", () => {
    const base = {
      status: "failed" as const,
      canReport: true,
      endedAt: "2026-10-20T00:00:00.000Z",
    };
    expect(
      step(trade({ ...base, canRate: true, rateUntil: "2026-11-01T00:00:00.000Z" })),
    ).toMatchObject({
      kind: "failed",
      canRate: true,
      canReport: true,
      deadline: { kind: "rateBy" },
    });
    expect(step(trade(base))).toMatchObject({
      kind: "failed",
      canRate: false,
      deadline: { kind: "ended", at: base.endedAt },
    });
  });

  test("cancelled", () => {
    expect(step(trade({ status: "cancelled", endedAt: "2026-10-09T00:00:00.000Z" }))).toEqual({
      kind: "cancelled",
      deadline: { kind: "ended", at: "2026-10-09T00:00:00.000Z" },
    });
  });
});

describe("nextStep, in progress", () => {
  test("your turn, with the end as deadline", () => {
    const s = step(trade({ canCancel: true }));
    expect(s).toMatchObject({
      kind: "yourTurn",
      canCancel: true,
      body: "send",
      deadline: { kind: "ends", at: ENDS },
    });
  });

  test("a decision outranks your turn", () => {
    const owed = leg();
    const decide = leg({ fromYou: false, substitutes: [copy()] });
    expect(stepKind(trade({ legs: [owed, decide] }))).toBe("youDecide");
  });

  test("the earliest acceptBy among several copies wins", () => {
    const late = leg({
      fromYou: false,
      substitutes: [copy({ id: 91, acceptBy: "2026-10-20T00:00:00.000Z" })],
    });
    const early = leg({
      fromYou: false,
      substitutes: [copy({ id: 92, acceptBy: "2026-10-17T00:00:00.000Z" })],
    });
    const s = step(trade({ legs: [late, early] }));
    expect(s).toMatchObject({ kind: "youDecide", copy: { id: 92 } });
    expect(s.deadline).toEqual({ kind: "decide", at: "2026-10-17T00:00:00.000Z" });
  });

  test("of one leg's copies, the earliest sent takes the banner", () => {
    const l = leg({
      fromYou: false,
      substitutes: [
        copy({ id: 93, at: "2026-10-09T00:00:00.000Z", acceptBy: "2026-10-20T00:00:00.000Z" }),
        copy({ id: 94, at: "2026-10-10T00:00:00.000Z", acceptBy: null }),
      ],
    });
    expect(step(trade({ legs: [leg(), l] }))).toMatchObject({
      kind: "youDecide",
      copy: { id: 93 },
    });
  });

  test("you sent a copy while they still owe: they decide", () => {
    const held = leg({ substitutes: [copy()] });
    expect(stepKind(trade({ legs: [held, leg({ fromYou: false })] }))).toBe("theyDecide");
  });

  test("a declined copy is no decision", () => {
    const l = leg({ fromYou: false, substitutes: [copy({ status: "declined" })] });
    expect(stepKind(trade({ legs: [verified(), l] }))).toBe("theirTurn");
  });

  test("both parties owing is your turn, with the first-sender body", () => {
    const first = (you: boolean, sent: boolean) =>
      step(trade({ firstSender: { userId: "u", you, sent } }));
    expect(first(true, false)).toMatchObject({ kind: "yourTurn", body: "firstYou" });
    expect(first(false, false)).toMatchObject({ kind: "yourTurn", body: "firstThem" });
    expect(first(false, true)).toMatchObject({ kind: "yourTurn", body: "firstThemSent" });
  });

  test("only you give: a plain body", () => {
    const s = step(trade({ legs: [leg()], firstSender: { userId: "u", you: true, sent: false } }));
    expect(s).toMatchObject({ kind: "yourTurn", body: "send" });
  });

  test("you owe several legs", () => {
    const s = step(trade({ legs: [leg(), leg(), leg({ fromYou: false })] }));
    expect(s).toMatchObject({ kind: "yourTurn" });
    expect(s.kind === "yourTurn" && s.legs).toHaveLength(2);
  });

  test("stuck beside a sendable leg: your turn with a note", () => {
    const s = step(trade({ legs: [leg({ stuck: true }), leg(), leg({ fromYou: false })] }));
    expect(s.kind).toBe("yourTurn");
    expect(s.kind === "yourTurn" && s.notes.map((n) => n.kind)).toEqual(["ownStuck"]);
  });

  test("only stuck legs owed: stuck", () => {
    const s = step(trade({ legs: [leg({ stuck: true }), verified({ fromYou: false })] }));
    expect(s.kind).toBe("stuck");
  });

  test("stuck outranks they decide", () => {
    const stuck = leg({ stuck: true });
    const held = leg({ substitutes: [copy()] });
    expect(stepKind(trade({ legs: [stuck, held, verified({ fromYou: false })] }))).toBe("stuck");
  });

  test("they decide: every owed leg holds a pending copy", () => {
    const held = leg({ substitutes: [copy()] });
    const s = step(trade({ legs: [held, verified({ fromYou: false })] }));
    expect(s).toMatchObject({ kind: "theyDecide", deadline: { kind: "copyLeft" } });
  });

  test("a sendable leg beside a held copy is still your turn", () => {
    const held = leg({ substitutes: [copy()] });
    expect(stepKind(trade({ legs: [held, leg(), leg({ fromYou: false })] }))).toBe("yourTurn");
  });

  test("their turn, with their stuck leg as a note", () => {
    const theirs = leg({ fromYou: false, stuck: true });
    const s = step(trade({ legs: [verified(), theirs], canReport: true }));
    expect(s).toMatchObject({ kind: "theirTurn", canReport: true });
    expect(s.kind === "theirTurn" && s.notes.map((n) => n.kind)).toEqual(["theirStuck"]);
  });

  test("a cash trade where only you pay is their turn", () => {
    expect(stepKind(trade({ legs: [leg({ fromYou: false })] }))).toBe("theirTurn");
  });

  test("a cash trade where only you give is your turn", () => {
    expect(stepKind(trade({ legs: [leg()] }))).toBe("yourTurn");
  });

  test("notes: indexer first, then own stuck, then theirs, once each", () => {
    const s = step(
      trade({
        indexerBehind: true,
        legs: [leg({ stuck: true }), leg(), leg({ fromYou: false, stuck: true })],
      }),
    );
    expect(s.kind === "yourTurn" && s.notes.map((n) => n.kind)).toEqual([
      "indexerBehind",
      "ownStuck",
      "theirStuck",
    ]);
  });

  test("the indexer note shows in every in-progress state", () => {
    const behind = (legs: ReturnType<typeof leg>[]) => step(trade({ indexerBehind: true, legs }));
    for (const s of [
      behind([leg({ fromYou: false, substitutes: [copy()] })]),
      behind([leg({ stuck: true })]),
      behind([leg({ substitutes: [copy()] })]),
      behind([leg({ fromYou: false })]),
    ]) {
      expect("notes" in s && s.notes[0]).toEqual({ kind: "indexerBehind" });
    }
  });

  test("past 14 days: the end is held, never negative", () => {
    const late = nextStep(trade(), new Date(ENDS).getTime() + HOUR);
    expect(late.deadline).toEqual({ kind: "endsHeld" });
  });

  test("a copy without acceptBy falls back to the end", () => {
    const l = leg({ fromYou: false, substitutes: [copy({ acceptBy: null })] });
    expect(step(trade({ legs: [l] })).deadline).toEqual({ kind: "ends", at: ENDS });
  });
});

describe("timeLeft", () => {
  // local times, so the calendar count doesn't depend on the zone the tests run in
  const local = (month: number, day: number, hour: number, minute: number) =>
    new Date(2026, month, day, hour, minute).getTime();

  test("calendar days to the deadline's date, at any hour", () => {
    const end = new Date(local(9, 22, 15, 10)).toISOString();
    expect(timeLeft(end, local(9, 17, 15, 0))).toEqual({ unit: "day", value: 5 });
    expect(timeLeft(end, local(9, 17, 16, 0))).toEqual({ unit: "day", value: 5 });
    expect(timeLeft(end, local(9, 21, 15, 10))).toEqual({ unit: "day", value: 1 });
    expect(timeLeft(end, local(9, 21, 16, 0))).toEqual({ unit: "hour", value: 24 });
  });

  test("across midnight the date decides", () => {
    const end = new Date(local(9, 22, 0, 30)).toISOString();
    expect(timeLeft(end, local(9, 20, 23, 0))).toEqual({ unit: "day", value: 2 });
  });

  test("under a day: hours rounded up, at least 1", () => {
    const now = new Date("2026-10-17T00:00:00.000Z").getTime();
    expect(timeLeft("2026-10-17T05:30:00.000Z", now)).toEqual({ unit: "hour", value: 6 });
    expect(timeLeft("2026-10-17T00:00:10.000Z", now)).toEqual({ unit: "hour", value: 1 });
    expect(timeLeft("2026-10-16T00:00:00.000Z", now)).toEqual({ unit: "hour", value: 1 });
  });
});
