import {
  awayChange,
  type LegResult,
  type LegRow,
  type SettledTrade,
  stuckChange,
} from "@repo/api/lib/trade-match";
import { awayBreaksAt, type ShownSerial } from "@repo/api/schemas/offer";

type Name = (userId: string) => { userId: string; name: string };

/**
 * The waiting legs whose `untransferable_at` a run sets (the indexer now reads the objekt as
 * non-transferable) and clears (it reads transferable again), in `waiting` order.
 */
export function stuckPlan<L extends Pick<LegRow, "id">>(
  waiting: L[],
  state: { id: number; untransferableAt: string | null }[],
  transferable: (leg: L) => boolean | undefined,
) {
  const stuckSince = new Map(state.map((leg) => [leg.id, leg.untransferableAt]));
  const changes = Map.groupBy(waiting, (leg) =>
    stuckChange(transferable(leg), stuckSince.get(leg.id) ?? null),
  );
  return {
    mark: (changes.get("stuck") ?? []).map((leg) => leg.id),
    clear: (changes.get("clear") ?? []).map((leg) => leg.id),
  };
}

export type AwayMark = {
  legId: number;
  since: string;
  /** the leg's giver, who is told the move is theirs */
  giverId: string;
  /** the asked-for objekt, which the note names */
  objektId: string | null;
};

/**
 * The waiting legs whose `away_at` a run sets (to when the objekt left) and clears (it is
 * back, or the leg is stuck). `first` is the move that breaks first; equal times keep the
 * waiting order.
 */
export function awayPlan(
  waiting: Pick<LegRow, "id" | "from_user_id" | "objekt_id">[],
  awayAt: { id: number; awayAt: string | null }[],
  results: ReadonlyMap<number, LegResult>,
) {
  const awayOf = new Map(awayAt.map((leg) => [leg.id, leg.awayAt]));
  const mark: AwayMark[] = [];
  const clear: number[] = [];
  for (const leg of waiting) {
    const result = results.get(leg.id);
    const change = awayChange(result, awayOf.get(leg.id) ?? null);
    if (change === "clear") clear.push(leg.id);
    if (change === "away" && result?.kind === "pending" && result.awaySince) {
      mark.push({
        legId: leg.id,
        since: result.awaySince,
        giverId: leg.from_user_id,
        objektId: leg.objekt_id,
      });
    }
  }
  // the trade group holds one unread note per reader, so it names the move that breaks first
  const first = mark.toSorted((a, b) => Date.parse(a.since) - Date.parse(b.since))[0] ?? null;
  return { mark, clear, first };
}

/** The `away` note each party gets, with when the leg breaks; `asked` is the first leg's objekt. */
export function awayNotes(
  settled: SettledTrade,
  first: AwayMark,
  asked: ShownSerial,
  progress: { verified: number; total: number },
  name: Name,
) {
  const breaksAt = awayBreaksAt(first.since);
  const { tradeId, offerId, conversationId, userA, userB } = settled;
  return [userA, userB].map((userId) => ({
    type: "trade" as const,
    userId,
    payload: {
      tradeId,
      offerId,
      conversationId,
      event: "away" as const,
      reason: null,
      progress,
      partner: name(userId === userA ? userB : userA),
      breaksAt,
      away: { asked, byYou: userId === first.giverId },
    },
  }));
}
