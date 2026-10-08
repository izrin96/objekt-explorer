import { expiredOutcome } from "@repo/api/lib/trade-match";
import { TRADE_EXPIRE_DAYS } from "@repo/api/schemas/offer";
import { partyNames, writeNotes } from "@repo/api/services/offer/notes";
import { db } from "@repo/db";
import { offer, trade, tradeLeg } from "@repo/db/schema";
import { and, eq, lte, sql } from "drizzle-orm";

import type { Publish } from "../../lib/trade-publish";

const EXPIRE_AFTER = sql`make_interval(days => ${TRADE_EXPIRE_DAYS})`;

/**
 * Ends every trade still in progress `TRADE_EXPIRE_DAYS` after accept, releasing its reserved
 * objekts. Runs after the run's own verification, so a transfer that just landed completes first.
 */
export async function expireStalls(): Promise<Publish[]> {
  const stalled = await db
    .select({ id: trade.id })
    .from(trade)
    .where(
      and(eq(trade.status, "in_progress"), lte(trade.acceptedAt, sql`now() - ${EXPIRE_AFTER}`)),
    );
  const publishes: Publish[] = [];
  for (const { id } of stalled) {
    const publish = await db.transaction(async (tx) => {
      // the lock a party's cancel and the verifier's settle take too
      const [row] = await tx
        .select({
          status: trade.status,
          offerId: trade.offerId,
          userA: trade.userA,
          userB: trade.userB,
          conversationId: offer.conversationId,
        })
        .from(trade)
        .innerJoin(offer, eq(offer.id, trade.offerId))
        .where(eq(trade.id, id))
        .for("update", { of: trade });
      if (row?.status !== "in_progress") return null;
      const { offerId, userA, userB, conversationId } = row;

      const legs = await tx
        .select({ verifiedAt: tradeLeg.verifiedAt })
        .from(tradeLeg)
        .where(eq(tradeLeg.tradeId, id));
      const progress = {
        verified: legs.filter((leg) => leg.verifiedAt !== null).length,
        total: legs.length,
      };
      const status = expiredOutcome(progress.verified);

      await tx
        .update(trade)
        .set({ status, endedAt: sql`now()`, cancelReason: "expired" })
        .where(eq(trade.id, id));
      await tx
        .update(tradeLeg)
        .set({ open: false })
        .where(and(eq(tradeLeg.tradeId, id), eq(tradeLeg.open, true)));

      const parties = [userA, userB];
      const name = await partyNames(parties);
      const notified = await writeNotes(
        tx,
        parties.map((userId) => ({
          type: "trade" as const,
          userId,
          payload: {
            tradeId: id,
            offerId,
            conversationId,
            event: status,
            reason: "expired" as const,
            progress,
            partner: name(userId === userA ? userB : userA),
          },
        })),
      );
      return { notified, conversations: [{ id: conversationId, userIds: parties }] };
    });
    if (publish) publishes.push(publish);
  }
  return publishes;
}
