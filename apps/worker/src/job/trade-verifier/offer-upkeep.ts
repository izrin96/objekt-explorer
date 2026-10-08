import { type HeldItem, itemStillHeld, type SeenTransfer } from "@repo/api/lib/offer-rules";
import { partyNames, writeNotes } from "@repo/api/services/offer/notes";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts, transfers } from "@repo/db/indexer/schema";
import { offer } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { unique } from "../../lib/array";
import { earliest, offerNotes, toPublish } from "../../lib/offer-notes";
import type { Publish } from "../../lib/trade-publish";

const OWNER_BATCH = 500;

const offerRef = {
  id: offer.id,
  conversationId: offer.conversationId,
  fromUserId: offer.fromUserId,
  toUserId: offer.toUserId,
};

/** Writes `expired`, and cancels offers whose specific objekt left its side's wallets. */
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
    offer_id: number;
    objekt_id: string;
    created_at: string;
    holders: string[];
    receivers: string[];
  }>(sql`
    SELECT o.id AS offer_id, i.objekt_id, o.created_at::text AS created_at,
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
    offerId: row.offer_id,
    objektId: row.objekt_id,
    holders: row.holders,
    receivers: row.receivers,
    since: row.created_at,
  }));
  const watchedObjekts = unique(items.map((item) => item.objektId));
  const owners = await chunkMap(watchedObjekts, OWNER_BATCH, (ids) =>
    indexer
      .select({ id: objekts.id, owner: objekts.owner })
      .from(objekts)
      .where(inArray(objekts.id, ids)),
  );
  const ownerOf = new Map(owners.map((row) => [row.id, row.owner.toLowerCase()]));
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

  let moved = 0;
  if (movedIds.length > 0) {
    const publish = await db.transaction(async (tx) => {
      const rows = await tx
        .update(offer)
        .set({ status: "cancelled", cancelReason: "token_moved", respondedAt: sql`now()` })
        .where(and(inArray(offer.id, movedIds), eq(offer.status, "open")))
        .returning(offerRef);
      moved = rows.length;
      const name = await partyNames(rows.flatMap((o) => [o.fromUserId, o.toUserId]));
      return toPublish(
        rows,
        await writeNotes(tx, offerNotes(rows, "cancelled", "token_moved", name)),
      );
    });
    publishes.push(publish);
  }
  return { publishes, expired, moved, watchedObjekts };
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
