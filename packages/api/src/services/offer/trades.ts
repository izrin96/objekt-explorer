import { ORPCError } from "@orpc/server";
import { db, type Tx } from "@repo/db";
import { offer, trade, tradeFeedback, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";

import { isBehind, parseIndexerSeen } from "../../lib/indexer-seen";
import { atFault, cancelRefusal, rateRefusal } from "../../lib/offer-rules";
import { addressSet } from "../../lib/trade-match";
import {
  type TradeCancelReason,
  type TradeRating,
  type TradeStatus,
  INDEXER_SEEN_KEY,
} from "../../schemas/offer";
import { chatSafety, publishChatChanged } from "../chat";
import { indexerCaughtUp } from "../indexer-catch-up";
import { redis, redisFailOpen } from "../redis";
import { forgetReputation } from "../reputation";
import { refuseOffer } from "./core";
import { partyNames, writeNotes } from "./notes";
import { publishTouched } from "./state";
import { countVerified, lockTradeRow } from "./trade-row";
import { heldCopies, loadOpenLegs, matchOpenLegs } from "./verify";

const tradeColumns = {
  id: trade.id,
  offerId: trade.offerId,
  userA: trade.userA,
  userB: trade.userB,
  status: sql<TradeStatus>`${trade.status}`,
  cancelReason: sql<TradeCancelReason | null>`${trade.cancelReason}`,
  cancelledBy: trade.cancelledBy,
  acceptedAt: trade.acceptedAt,
  endedAt: trade.endedAt,
};

/** NOT_FOUND unless the viewer is one of the trade's two parties. */
export async function findTrade(tradeId: number, me: string) {
  const [row] = await db
    .select({ ...tradeColumns, conversationId: offer.conversationId })
    .from(trade)
    .innerJoin(offer, eq(offer.id, trade.offerId))
    .where(and(eq(trade.id, tradeId), or(eq(trade.userA, me), eq(trade.userB, me))));
  if (!row) throw new ORPCError("NOT_FOUND");
  return { ...row, partnerId: row.userA === me ? row.userB : row.userA };
}

/**
 * Ends an in-progress trade as cancelled, under its row lock: every leg closes, releasing its
 * reservation, and a wrong copy still pending on one is declined, so none waits on a closed leg.
 */
export async function endTradeCancelled(
  tx: Tx,
  tradeId: number,
  reason: Extract<TradeCancelReason, "party" | "agreed">,
  cancelledBy: string,
) {
  await tx
    .update(trade)
    .set({ status: "cancelled", endedAt: sql`now()`, cancelledBy, cancelReason: reason })
    .where(eq(trade.id, tradeId));
  await tx.update(tradeLeg).set({ open: false }).where(eq(tradeLeg.tradeId, tradeId));
  await tx
    .update(tradeSubstitute)
    .set({ status: "declined", decidedAt: sql`now()` })
    .where(
      and(
        eq(tradeSubstitute.status, "pending"),
        inArray(
          tradeSubstitute.tradeLegId,
          tx.select({ id: tradeLeg.id }).from(tradeLeg).where(eq(tradeLeg.tradeId, tradeId)),
        ),
      ),
    );
}

// null when Redis is down, which `isBehind` reads as behind
export const readIndexerSeen = async () =>
  parseIndexerSeen(await redisFailOpen("indexer seen", () => redis.get(INDEXER_SEEN_KEY)));

export async function cancelTrade(me: string, tradeId: number) {
  const row = await findTrade(tradeId, me);
  const { partnerId } = row;
  if (row.status !== "in_progress") refuseOffer("trade_ended");
  // a transfer the verifier hasn't run on yet locks the trade too, a wrong copy included, or a
  // party could send nothing back and cancel right after receiving
  // matched with the parties' other trades, as the verifier matches them, so a transfer
  // another trade's leg takes doesn't lock this one
  const refuseIfSent = async () => {
    const legs = await loadOpenLegs([me, partnerId]);
    const ourLegs = legs.filter((leg) => leg.trade_id === tradeId);
    const ours = new Set(ourLegs.map((leg) => leg.id));
    const between = {
      from: ourLegs.flatMap((leg) => Array.from(addressSet(leg.from_addresses, leg.from_current))),
      to: ourLegs.flatMap((leg) => Array.from(addressSet(leg.to_addresses, leg.to_current))),
    };
    if (ours.size === 0) return between;
    // only verified legs and held copies lock it, and neither waits on the away grace
    const { results, nearMisses } = await matchOpenLegs(legs, null);
    const locked =
      [...ours].some((id) => results.get(id)?.kind === "verified") ||
      nearMisses.some((miss) => ours.has(miss.legId));
    if (locked) refuseOffer("locked");
    return between;
  };
  // checked once before the wait, so a trade already locked refuses at once
  const [between, name] = await Promise.all([refuseIfSent(), partyNames([me])]);
  // the indexer trails the chain by seconds, so a send just made would not lock the trade yet:
  // wait until it has read every block mined before this cancel, then check again
  const behind = isBehind(await readIndexerSeen(), Date.now()) || !(await indexerCaughtUp(between));
  if (!behind) await refuseIfSent();

  const notified = await db.transaction(async (tx) => {
    const status = await lockTradeRow(tx, tradeId);
    const counts = await countVerified(tx, tradeId);
    const refusal = cancelRefusal(
      {
        status: status!,
        acceptedAt: row.acceptedAt,
        endedAt: row.endedAt,
        verifiedLegs: counts.verified,
      },
      behind,
      await heldCopies(tx, tradeId),
    );
    if (refusal) refuseOffer(refusal);

    await endTradeCancelled(tx, tradeId, "party", me);
    return writeNotes(tx, [
      {
        type: "trade",
        userId: partnerId,
        payload: {
          tradeId,
          offerId: row.offerId,
          conversationId: row.conversationId,
          event: "cancelled",
          reason: "party",
          progress: counts,
          partner: name(me),
        },
      },
    ]);
  });

  await publishTouched(
    [{ conversationId: row.conversationId, userIds: [me, partnerId] }],
    notified,
  );
}

/** Feedback on a completed trade, or a failed one from the party who delivered, changeable for 14 days; only totals are ever shown. */
export async function rateTrade(me: string, tradeId: number, rating: TradeRating) {
  const row = await findTrade(tradeId, me);
  const [safety, legs] = await Promise.all([
    chatSafety(me, row.partnerId),
    db
      .select({
        fromUserId: tradeLeg.fromUserId,
        verifiedAt: tradeLeg.verifiedAt,
        confirmedAt: tradeLeg.confirmedAt,
      })
      .from(tradeLeg)
      .where(eq(tradeLeg.tradeId, tradeId)),
  ]);
  if (safety.tradeBlocked) refuseOffer("trade_blocked");
  const refusal = rateRefusal(
    {
      ...row,
      confirmedLegs: legs.filter((leg) => leg.confirmedAt !== null).length,
    },
    new Date(),
    me,
    atFault(legs, row.userA, row.userB),
  );
  if (refusal) refuseOffer(refusal);

  await db
    .insert(tradeFeedback)
    .values({ tradeId, fromUserId: me, toUserId: row.partnerId, rating })
    .onConflictDoUpdate({
      target: [tradeFeedback.tradeId, tradeFeedback.fromUserId],
      set: { rating, updatedAt: sql`now()` },
    });
  await forgetReputation([me, row.partnerId]);
  // the rater's deal line and strip stop asking for a rating; the partner's deal is unchanged
  await publishChatChanged([me], row.conversationId);
  return { rating };
}
