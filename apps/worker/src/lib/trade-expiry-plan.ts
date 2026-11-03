import type { SettledTrade } from "@repo/api/lib/trade-match";

type Progress = { verified: number; total: number };

/**
 * An expiring trade's progress once its legs accepted their earliest copies: complete when every
 * leg verified (it then settles as a finished trade), else the progress the expiry note shows.
 */
export function expiryPlan(before: Progress, acceptedCount: number) {
  const progress = { verified: before.verified + acceptedCount, total: before.total };
  return progress.verified === progress.total
    ? { complete: true as const }
    : { complete: false as const, progress };
}

/** The `expired` note each party gets, naming the other, and whose reputation changes (a failed trade, both). */
export function expiryNotes(
  settled: SettledTrade,
  status: "failed" | "cancelled",
  progress: Progress,
  name: (userId: string) => { userId: string; name: string },
) {
  const { tradeId, offerId, conversationId, userA, userB } = settled;
  const parties = [userA, userB];
  return {
    notes: parties.map((userId) => ({
      type: "trade" as const,
      userId,
      payload: {
        tradeId,
        offerId,
        conversationId,
        event: status,
        reason: "expired" as const,
        progress,
        partner: name(userId === userA ? userB : userA),
      },
    })),
    reputations: status === "failed" ? parties : [],
  };
}
