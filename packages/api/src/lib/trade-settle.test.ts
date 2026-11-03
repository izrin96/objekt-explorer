import { describe, expect, test } from "bun:test";

import type { LegResult, SettledTrade } from "./trade-match";
import { needsHeld, settleNotes, settlePlan } from "./trade-settle";

const verified: LegResult = {
  kind: "verified",
  transferId: "t",
  txHash: "0xa",
  objektId: "1",
  at: "2026-11-01T10:00:00.000Z",
};
const pending: LegResult = { kind: "pending" };
const broken: LegResult = { kind: "broken", transferId: "t", at: "2026-11-01T10:00:00.000Z" };
const stuck: LegResult = { kind: "stuck" };

const counts = (alreadyVerified: number, verifiedNow: number, total: number, autoAccepted = 0) => ({
  alreadyVerified,
  verified: verifiedNow,
  total,
  autoAccepted,
});

describe("settlePlan", () => {
  test("every open leg verified completes the trade and changes both reputations", () => {
    const plan = settlePlan([verified, verified], counts(0, 2, 2), 0, true);
    expect(plan.status).toBe("completed");
    expect(plan.ended).toBe(true);
    expect(plan.cancelReason).toBeNull();
    expect(plan.note).toEqual({
      event: "completed",
      reason: null,
      progress: { verified: 2, total: 2 },
    });
    expect(plan.changesReputation).toBe(true);
  });

  test("one verified and one pending notes leg_verified with the progress so far", () => {
    const plan = settlePlan([verified, pending], counts(1, 1, 4), 0, true);
    expect(plan.status).toBe("in_progress");
    expect(plan.ended).toBe(false);
    expect(plan.note).toEqual({
      event: "leg_verified",
      reason: null,
      progress: { verified: 2, total: 4 },
    });
    expect(plan.changesReputation).toBe(false);
  });

  test("a verified leg that was an auto-accepted copy carries its own note, so no note here", () => {
    const plan = settlePlan([verified, pending], counts(0, 1, 2, 1), 0, true);
    expect(plan.ended).toBe(false);
    expect(plan.note).toBeNull();
  });

  test("noteLegs false and not ended gives no note", () => {
    const plan = settlePlan([verified, pending], counts(0, 1, 2), 0, false);
    expect(plan.note).toBeNull();
  });

  test("noteLegs false and ended still notes the completion", () => {
    const plan = settlePlan([verified], counts(0, 1, 1), 0, false);
    expect(plan.note?.event).toBe("completed");
  });

  test("a broken leg with nothing sent cancels as token_moved, with no reputations", () => {
    const plan = settlePlan([broken], counts(0, 0, 1), 0, true);
    expect(plan.status).toBe("cancelled");
    expect(plan.cancelReason).toBe("token_moved");
    expect(plan.note).toEqual({
      event: "cancelled",
      reason: "token_moved",
      progress: { verified: 0, total: 1 },
    });
    expect(plan.changesReputation).toBe(false);
  });

  test("a broken leg with a held copy fails the trade", () => {
    const plan = settlePlan([broken], counts(0, 0, 1), 1, true);
    expect(plan.status).toBe("failed");
    expect(plan.cancelReason).toBeNull();
    expect(plan.changesReputation).toBe(true);
  });

  test("a broken leg after an earlier verified leg fails the trade", () => {
    const plan = settlePlan([broken], counts(1, 0, 2), 0, true);
    expect(plan.status).toBe("failed");
    expect(plan.cancelReason).toBeNull();
    expect(plan.changesReputation).toBe(true);
  });

  test("a stuck leg with nothing sent cancels as not_transferable", () => {
    const plan = settlePlan([stuck], counts(0, 0, 1), 0, true);
    expect(plan.status).toBe("cancelled");
    expect(plan.cancelReason).toBe("not_transferable");
  });

  test("a stuck leg after a verified one keeps the trade in progress, quietly", () => {
    const plan = settlePlan([stuck], counts(1, 0, 2), 0, true);
    expect(plan.status).toBe("in_progress");
    expect(plan.ended).toBe(false);
    expect(plan.note).toBeNull();
  });

  test("no open legs completes the trade", () => {
    const plan = settlePlan([], counts(2, 0, 2), 0, true);
    expect(plan.status).toBe("completed");
    expect(plan.ended).toBe(true);
  });
});

describe("needsHeld", () => {
  test("is true only with a broken or stuck result", () => {
    expect(needsHeld([verified, pending])).toBe(false);
    expect(needsHeld([])).toBe(false);
    expect(needsHeld([verified, broken])).toBe(true);
    expect(needsHeld([pending, stuck])).toBe(true);
  });
});

describe("settleNotes", () => {
  const settled: SettledTrade = {
    tradeId: 7,
    offerId: 3,
    conversationId: 9,
    userA: "a",
    userB: "b",
  };
  const name = (userId: string) => ({ userId, name: `name-${userId}` });
  const plan = settlePlan([verified], counts(0, 1, 1), 0, true);

  test("one note per party, each naming the other", () => {
    const notes = settleNotes(settled, plan, name, false);
    expect(notes.map((n) => [n.userId, n.payload.partner])).toEqual([
      ["a", { userId: "b", name: "name-b" }],
      ["b", { userId: "a", name: "name-a" }],
    ]);
    expect(notes[0]!.payload).toMatchObject({
      tradeId: 7,
      offerId: 3,
      conversationId: 9,
      event: "completed",
      reason: null,
      progress: { verified: 1, total: 1 },
    });
  });

  test("confirmed is set only when a leg was confirmed, else the key is absent", () => {
    expect(settleNotes(settled, plan, name, true)[0]!.payload.confirmed).toBe(true);
    expect("confirmed" in settleNotes(settled, plan, name, false)[0]!.payload).toBe(false);
  });
});
