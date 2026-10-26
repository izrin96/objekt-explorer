import { type HeldItem, itemStillHeld, type SeenTransfer } from "@repo/api/lib/offer-rules";
import { partyNames, writeNotes } from "@repo/api/services/offer/notes";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts, transfers } from "@repo/db/indexer/schema";
import { offer } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { unique } from "../../lib/array";
import { earliest, type OfferRef, offerNotes, toPublish } from "../../lib/offer-notes";
import { sentChanges } from "../../lib/offer-sent";
import type { Publish } from "../../lib/trade-publish";

const OWNER_BATCH = 500;

const offerRef = {
  id: offer.id,
  conversationId: offer.conversationId,
  fromUserId: offer.fromUserId,
  toUserId: offer.toUserId,
};

/**
 * Writes `expired`, cancels offers whose specific objekt left its side's wallets or can no
 * longer be transferred, and keeps the marks of objekts already sent to the other party.
 */
export async function offerUpkeep() {
  const expiring = await db
    .select(offerRef)
    .from(offer)
    .where(and(eq(offer.status, "open"), lte(offer.expiresAt, sql`now()`)));
  const publishes: Publish[] = [];
  let expired = 0;
  if (expiring.length > 0) {
    const name = await partyNames(expiring.flatMap((o) => [o.fromUserId, o.toUserId]));
    const publish = await db.transaction(async (tx) => {
      const rows = await tx
        .update(offer)
        .set({ status: "expired", respondedAt: sql`now()` })
        .where(
          and(
            inArray(
              offer.id,
              expiring.map((o) => o.id),
            ),
            eq(offer.status, "open"),
            lte(offer.expiresAt, sql`now()`),
          ),
        )
        .returning(offerRef);
      expired = rows.length;
      return toPublish(rows, await writeNotes(tx, offerNotes(rows, "expired", null, name)));
    });
    publishes.push(publish);
  }

  const held = await db.execute<{
    item_id: number;
    offer_id: number;
    conversation_id: number;
    from_user_id: string;
    to_user_id: string;
    marked: boolean;
    objekt_id: string;
    created_at: string;
    holders: string[];
    receivers: string[];
  }>(sql`
    SELECT i.id AS item_id, o.id AS offer_id, o.conversation_id, o.from_user_id, o.to_user_id,
      i.sent_at IS NOT NULL AS marked, i.objekt_id, o.created_at::text AS created_at,
      ARRAY(
        SELECT lower(a.address) FROM user_address a
        WHERE a.user_id = CASE WHEN i.side = 'give' THEN o.from_user_id ELSE o.to_user_id END
      ) AS holders,
      ARRAY(
        SELECT lower(a.address) FROM user_address a
        WHERE a.user_id = CASE WHEN i.side = 'give' THEN o.to_user_id ELSE o.from_user_id END
      ) AS receivers
    FROM offer o
    JOIN offer_item i ON i.offer_id = o.id
    WHERE o.status = 'open' AND o.expires_at > now() AND i.objekt_id IS NOT NULL
  `);
  const items = held.rows.map((row) => ({
    itemId: row.item_id,
    marked: row.marked,
    offer: {
      id: row.offer_id,
      conversationId: row.conversation_id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
    },
    offerId: row.offer_id,
    objektId: row.objekt_id,
    holders: row.holders,
    receivers: row.receivers,
    since: row.created_at,
  }));
  const watchedObjekts = unique(items.map((item) => item.objektId));
  const owners = await chunkMap(watchedObjekts, OWNER_BATCH, (ids) =>
    indexer
      .select({ id: objekts.id, owner: objekts.owner, transferable: objekts.transferable })
      .from(objekts)
      .where(inArray(objekts.id, ids)),
  );
  const ownerOf = new Map(owners.map((row) => [row.id, row.owner.toLowerCase()]));
  const untransferable = new Set(owners.flatMap((row) => (row.transferable ? [] : [row.id])));
  const sent = await sentToReceivers(
    items.filter((item) => {
      const owner = ownerOf.get(item.objektId);
      return owner !== undefined && item.receivers.includes(owner);
    }),
  );
  const movedIds = unique(
    items
      .filter((item) => !itemStillHeld(item, ownerOf.get(item.objektId), sent))
      .map((item) => item.offerId),
  );

  const movedSet = new Set(movedIds);
  const stuckSet = new Set(
    items
      .filter((item) => untransferable.has(item.objektId) && !movedSet.has(item.offerId))
      .map((item) => item.offerId),
  );
  const stuckIds = [...stuckSet];

  const movedRun = await cancelOffers(movedIds, "token_moved");
  const stuckRun = await cancelOffers(stuckIds, "not_transferable");
  publishes.push(...movedRun.publishes, ...stuckRun.publishes);
  const offerOf = new Map(items.map((item) => [item.offerId, item.offer]));
  const sentRun = await applySent(
    sentChanges(items, ownerOf, sent, new Set([...movedSet, ...stuckSet])),
    offerOf,
  );
  if (sentRun.publish !== null) publishes.push(sentRun.publish);
  return {
    publishes,
    expired,
    moved: movedRun.cancelled + stuckRun.cancelled,
    /** offers whose "already sent" marks changed */
    sentChanged: sentRun.offers,
    watchedObjekts,
  };
}

/**
 * Writes the marks `sentChanges` chose, only on offers still open, and refreshes their cards.
 * No notification: the card is where the mark matters.
 */
async function applySent(
  { mark, clear }: ReturnType<typeof sentChanges>,
  offerOf: Map<number, OfferRef>,
) {
  if (mark.length === 0 && clear.length === 0) return { publish: null, offers: 0 };
  const changed = await db.transaction(async (tx) => {
    const ids: number[] = [];
    if (mark.length > 0) {
      const values = sql.join(
        mark.map((m) => sql`(${m.itemId}::int, ${m.at}::timestamptz)`),
        sql`, `,
      );
      const rows = await tx.execute<{ offer_id: number }>(sql`
        UPDATE offer_item i SET sent_at = v.at
        FROM (VALUES ${values}) AS v(id, at), offer o
        WHERE i.id = v.id AND o.id = i.offer_id AND o.status = 'open' AND i.sent_at IS NULL
        RETURNING i.offer_id
      `);
      ids.push(...rows.rows.map((row) => row.offer_id));
    }
    if (clear.length > 0) {
      const rows = await tx.execute<{ offer_id: number }>(sql`
        UPDATE offer_item i SET sent_at = NULL
        FROM offer o
        WHERE i.id = ANY(${sql.param(clear.map((c) => c.itemId))}::int[])
          AND o.id = i.offer_id AND o.status = 'open' AND i.sent_at IS NOT NULL
        RETURNING i.offer_id
      `);
      ids.push(...rows.rows.map((row) => row.offer_id));
    }
    return unique(ids).flatMap((id) => offerOf.get(id) ?? []);
  });
  return {
    publish: changed.length === 0 ? null : toPublish(changed, []),
    offers: changed.length,
  };
}

async function cancelOffers(ids: number[], reason: "token_moved" | "not_transferable") {
  if (ids.length === 0) return { publishes: [], cancelled: 0 };
  let cancelled = 0;
  const publish = await db.transaction(async (tx) => {
    const rows = await tx
      .update(offer)
      .set({ status: "cancelled", cancelReason: reason, respondedAt: sql`now()` })
      .where(and(inArray(offer.id, ids), eq(offer.status, "open")))
      .returning(offerRef);
    cancelled = rows.length;
    const name = await partyNames(rows.flatMap((o) => [o.fromUserId, o.toUserId]));
    return toPublish(rows, await writeNotes(tx, offerNotes(rows, "cancelled", reason, name)));
  });
  return { publishes: [publish], cancelled };
}

/** Transfers into the receivers' wallets since the earliest of these offers, for `itemStillHeld`. */
async function sentToReceivers(items: HeldItem[]): Promise<SeenTransfer[]> {
  if (items.length === 0) return [];
  const since = earliest(items.map((item) => item.since));
  const receivers = unique(items.flatMap((item) => item.receivers));
  const rows = await chunkMap(unique(items.map((item) => item.objektId)), OWNER_BATCH, (ids) =>
    indexer
      .select({
        objektId: transfers.objektId,
        from: transfers.from,
        to: transfers.to,
        timestamp: transfers.timestamp,
      })
      .from(transfers)
      .where(
        and(
          inArray(transfers.objektId, ids),
          inArray(transfers.to, receivers),
          gte(transfers.timestamp, since),
        ),
      ),
  );
  return rows.flatMap(({ objektId, from, to, timestamp }) =>
    objektId ? [{ objektId, from, to, timestamp }] : [],
  );
}
