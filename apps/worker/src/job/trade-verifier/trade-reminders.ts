import { REMIND_AFTER_HOURS } from "@repo/api/schemas/offer";
import { writeNotes, partyNames } from "@repo/api/services/offer/notes";
import { db } from "@repo/db";
import { offer, trade, tradeLeg } from "@repo/db/schema";
import { and, eq, isNull, lte, sql } from "drizzle-orm";

import { unique } from "../../lib/array";
import type { Publish } from "../../lib/trade-publish";

const REMIND_AFTER = sql`make_interval(hours => ${REMIND_AFTER_HOURS})`;

/** One reminder per trade, `REMIND_AFTER_HOURS` after accept, to each party still owing a transfer. */
export async function remindStalls(): Promise<Publish[]> {
  const stalled = await db
    .select({ id: trade.id })
    .from(trade)
    .where(
      and(
        eq(trade.status, "in_progress"),
        isNull(trade.remindedAt),
        lte(trade.acceptedAt, sql`now() - ${REMIND_AFTER}`),
      ),
    );
  const publishes: Publish[] = [];
  for (const { id } of stalled) {
    const publish = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(trade)
        .set({ remindedAt: sql`now()` })
        .where(and(eq(trade.id, id), isNull(trade.remindedAt), eq(trade.status, "in_progress")))
        .returning({
          offerId: trade.offerId,
          userA: trade.userA,
          userB: trade.userB,
        });
      if (!row) return null;
      const [legs, [source]] = await Promise.all([
        tx
          .select({
            fromUserId: tradeLeg.fromUserId,
            open: tradeLeg.open,
            verifiedAt: tradeLeg.verifiedAt,
          })
          .from(tradeLeg)
          .where(eq(tradeLeg.tradeId, id)),
        tx
          .select({ conversationId: offer.conversationId })
          .from(offer)
          .where(eq(offer.id, row.offerId)),
      ]);
      const owing = unique(legs.filter((leg) => leg.open).map((leg) => leg.fromUserId));
      const name = await partyNames([row.userA, row.userB]);
      const progress = {
        verified: legs.filter((leg) => leg.verifiedAt !== null).length,
        total: legs.length,
      };
      const notified = await writeNotes(
        tx,
        owing.map((userId) => ({
          type: "trade" as const,
          userId,
          payload: {
            tradeId: id,
            offerId: row.offerId,
            conversationId: source!.conversationId,
            event: "reminder" as const,
            reason: null,
            progress,
            partner: name(userId === row.userA ? row.userB : row.userA),
          },
        })),
      );
      return { notified, conversations: [] };
    });
    if (publish) publishes.push(publish);
  }
  return publishes;
}
