import { describe, expect, test } from "bun:test";

import { expiredOutcome, type SettledTrade } from "@repo/api/lib/trade-match";

import { legProgress } from "./copy-accept";
import { expiryNotes, expiryPlan } from "./trade-expiry-plan";

const settled: SettledTrade = { tradeId: 7, offerId: 3, conversationId: 9, userA: "a", userB: "b" };
const name = (userId: string) => ({ userId, name: `name-${userId}` });

describe("expiryPlan", () => {
  test("one verified of two and one copy accepted completes", () => {
    expect(expiryPlan({ verified: 1, total: 2 }, 1)).toEqual({ complete: true });
  });

  test("nothing accepted keeps the progress, and one verified leg fails the trade", () => {
    const plan = expiryPlan({ verified: 1, total: 2 }, 0);
    expect(plan).toEqual({ complete: false, progress: { verified: 1, total: 2 } });
    if (plan.complete) throw new Error("expected an incomplete plan");
    expect(expiredOutcome(plan.progress.verified, 0)).toBe("failed");
  });

  test("a receiver-confirmed leg counts toward before, so the trade fails, not cancels", () => {
    const { progress: before } = legProgress([
      { id: 1, verifiedAt: "2026-11-01 10:00:00+00", objektId: "o1" },
      { id: 2, verifiedAt: null, objektId: "o2" },
    ]);
    const plan = expiryPlan(before, 0);
    if (plan.complete) throw new Error("expected an incomplete plan");
    expect(expiredOutcome(plan.progress.verified, 0)).toBe("failed");
  });

  test("nothing verified and nothing held cancels, and a held copy fails", () => {
    const plan = expiryPlan({ verified: 0, total: 2 }, 0);
    if (plan.complete) throw new Error("expected an incomplete plan");
    expect(expiredOutcome(plan.progress.verified, 0)).toBe("cancelled");
    expect(expiredOutcome(plan.progress.verified, 1)).toBe("failed");
  });
});

describe("expiryNotes", () => {
  const progress = { verified: 1, total: 2 };

  test("a failed trade notes both parties as failed with reason expired, and both reputations", () => {
    const { notes, reputations } = expiryNotes(settled, "failed", progress, name);
    expect(notes.map((n) => [n.userId, n.payload.partner.userId])).toEqual([
      ["a", "b"],
      ["b", "a"],
    ]);
    expect(notes[0]!.payload).toMatchObject({
      tradeId: 7,
      offerId: 3,
      conversationId: 9,
      event: "failed",
      reason: "expired",
      progress,
    });
    expect(reputations).toEqual(["a", "b"]);
  });

  test("a cancelled trade's note event is cancelled, reason still expired, no reputations", () => {
    const { notes, reputations } = expiryNotes(settled, "cancelled", progress, name);
    expect(notes[1]!.payload).toMatchObject({ event: "cancelled", reason: "expired" });
    expect(reputations).toEqual([]);
  });
});
