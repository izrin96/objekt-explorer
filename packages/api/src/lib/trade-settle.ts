import type { TradePayload } from "../schemas/offer";
import { type LegResult, legVerifiedNoted, type SettledTrade, tradeOutcome } from "./trade-match";

export type SettleCounts = {
  alreadyVerified: number;
  verified: number;
  total: number;
  /** how many of `verified` were wrong copies accepted automatically */
  autoAccepted?: number;
};

type Name = (userId: string) => { userId: string; name: string };

/** Whether a settle needs the held-copy count: only a broken or stuck leg reads it. */
export function needsHeld(applied: LegResult[]) {
  return applied.some((r) => r.kind === "broken" || r.kind === "stuck");
}

/**
 * What a settle writes: the trade's status, whether it ended, its cancel reason, the note both
 * parties get (null when the settle stays quiet) and whose reputation changes. `held` is the
 * wrong copies the receiver holds, read only when `needsHeld`.
 */
export function settlePlan(
  applied: LegResult[],
  counts: SettleCounts,
  held: number,
  noteLegs: boolean,
) {
  const outcome = tradeOutcome(applied, counts.alreadyVerified, held);
  const ended = outcome.status !== "in_progress";
  const cancelReason = outcome.status === "cancelled" ? outcome.reason : null;
  const event: TradePayload["event"] =
    outcome.status === "in_progress" ? "leg_verified" : outcome.status;
  const quiet =
    !ended && (!noteLegs || !legVerifiedNoted(counts.verified, counts.autoAccepted ?? 0));
  const note = quiet
    ? null
    : {
        event,
        reason: cancelReason,
        progress: { verified: counts.alreadyVerified + counts.verified, total: counts.total },
      };
  return {
    status: outcome.status,
    ended,
    cancelReason,
    note,
    // a completed or failed trade changes both parties' cached reputation
    changesReputation:
      note !== null && (outcome.status === "completed" || outcome.status === "failed"),
  };
}

/** The note each party gets, naming the other; `confirmed` only when a leg was confirmed received. */
export function settleNotes(
  settled: SettledTrade,
  plan: Pick<ReturnType<typeof settlePlan>, "note">,
  name: Name,
  confirmed: boolean,
) {
  const { note } = plan;
  if (note === null) return [];
  const { tradeId, userA, userB } = settled;
  return [userA, userB].map((userId) => ({
    type: "trade" as const,
    userId,
    payload: {
      tradeId,
      offerId: settled.offerId,
      conversationId: settled.conversationId,
      event: note.event,
      reason: note.reason,
      progress: note.progress,
      partner: name(userId === userA ? userB : userA),
      ...(confirmed ? { confirmed } : {}),
    },
  }));
}
