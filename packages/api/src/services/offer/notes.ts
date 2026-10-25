import type { db } from "@repo/db";
import { notification, notificationPref, offer, offerItem } from "@repo/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

import { unique } from "../../lib/unique";
import {
  noteObjekts,
  type OfferPayload,
  type OfferSide,
  type TradePayload,
} from "../../schemas/offer";
import { loadIdentities } from "../identities";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Note =
  | { type: "offer"; userId: string; payload: OfferPayload }
  | { type: "trade"; userId: string; payload: TradePayload };

const groupKeyOf = (note: Note) =>
  note.type === "offer" ? `offer:${note.payload.conversationId}` : `trade:${note.payload.tradeId}`;

/** The offers' creators and items, in one read, to name each note's objekts. */
async function offerObjekts(tx: Tx, notes: Note[]) {
  const rows = await tx
    .select({
      offerId: offerItem.offerId,
      side: offerItem.side,
      collectionSlug: offerItem.collectionSlug,
      fromUserId: offer.fromUserId,
    })
    .from(offerItem)
    .innerJoin(offer, eq(offer.id, offerItem.offerId))
    .where(inArray(offerItem.offerId, unique(notes.map((note) => note.payload.offerId))))
    .orderBy(offerItem.id);
  const byOffer = new Map<
    number,
    { fromUserId: string; items: { side: OfferSide; collectionSlug: string }[] }
  >();
  for (const row of rows) {
    const entry = byOffer.get(row.offerId) ?? { fromUserId: row.fromUserId, items: [] };
    entry.items.push({ side: row.side, collectionSlug: row.collectionSlug });
    byOffer.set(row.offerId, entry);
  }
  return (note: Note) => {
    const entry = byOffer.get(note.payload.offerId);
    return entry ? noteObjekts(entry.items, note.userId, entry.fromUserId) : [];
  };
}

/**
 * One unread row per group, holding the latest event; a type the user switched off writes
 * nothing. Each row names up to three of the offer's collections, what the reader gets first.
 * Shared by the API and the worker, so it imports nothing request-bound.
 */
export async function writeNotes(tx: Tx, notes: Note[]): Promise<string[]> {
  if (notes.length === 0) return [];
  const off = await tx
    .select({ userId: notificationPref.userId, type: notificationPref.type })
    .from(notificationPref)
    .where(
      and(
        inArray(notificationPref.userId, unique(notes.map((note) => note.userId))),
        inArray(notificationPref.type, unique(notes.map((note) => note.type))),
        eq(notificationPref.enabled, false),
      ),
    );
  const muted = new Set(off.map((row) => `${row.userId}:${row.type}`));
  const kept = notes.filter((note) => !muted.has(`${note.userId}:${note.type}`));
  const objektsOf = kept.length === 0 ? null : await offerObjekts(tx, kept);
  for (const note of kept) {
    const objekts = objektsOf?.(note) ?? [];
    const payload = objekts.length === 0 ? note.payload : { ...note.payload, objekts };
    await tx
      .insert(notification)
      .values({
        userId: note.userId,
        type: note.type,
        payload,
        groupKey: groupKeyOf(note),
      })
      .onConflictDoUpdate({
        target: [notification.userId, notification.groupKey],
        targetWhere: sql`read_at IS NULL`,
        set: { payload, createdAt: sql`now()` },
      });
  }
  return unique(kept.map((note) => note.userId));
}

/** Each account as a conversation names it, for notification payloads. */
export async function partyNames(userIds: string[]) {
  const identities = await loadIdentities(userIds);
  return (userId: string) => ({ userId, name: identities.get(userId)?.identity.name ?? "" });
}
