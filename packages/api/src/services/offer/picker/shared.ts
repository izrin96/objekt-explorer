import { toIndexedArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { collections } from "@repo/db/indexer/schema";
import { listEntries, lists, offer, offerItem } from "@repo/db/schema";
import { isSerialEstimated, shownSerial } from "@repo/lib/serial";
import { and, eq, gt, inArray, sql } from "drizzle-orm";

import type { itemFlags } from "../../../lib/offer-rules";
import { unique } from "../../../lib/unique";
import { type CollectionFilters } from "../../../schemas/common/filters";
import type { CandidateItem } from "../../../schemas/offer";
import { fetchCollectionsBySlug } from "../../list";
import type { IndexedObjekt } from "../core";

export function toCandidate(
  objekt: IndexedObjekt,
  flags: ReturnType<typeof itemFlags>,
  listSlug: string | null,
): CandidateItem {
  return {
    collectionSlug: objekt.slug,
    objektId: objekt.id,
    serial: shownSerial(objekt.serial),
    serialEstimated: isSerialEstimated(objekt.mintedAt),
    ...flags,
    listSlug,
    copies: null,
  };
}

export async function collectionsOf(slugs: string[]) {
  const rows = await fetchCollectionsBySlug(unique(slugs), []);
  return Object.fromEntries(rows.map((row) => [row.slug, row]));
}

export function collectionWhere(filters: Partial<CollectionFilters> | undefined) {
  if (!filters) return [];
  return [
    filters.artist?.length
      ? inArray(collections.artist, filters.artist.map(toIndexedArtist))
      : undefined,
    filters.member?.length ? inArray(collections.member, filters.member) : undefined,
    filters.season?.length ? inArray(collections.season, filters.season) : undefined,
    filters.class?.length ? inArray(collections.class, filters.class) : undefined,
    filters.on_offline?.length ? inArray(collections.onOffline, filters.on_offline) : undefined,
    filters.collection?.length ? inArray(collections.collectionNo, filters.collection) : undefined,
  ];
}

/**
 * The specific objekts the open offer sent to `me` in this conversation gives. A counter may
 * keep them on its get side: the partner put them up, so they need no list.
 */
export async function counteredGives(conversationId: number | null, me: string) {
  if (conversationId === null) return null;
  const rows = await db
    .select({ offerId: offer.id, objektId: offerItem.objektId, slug: offerItem.collectionSlug })
    .from(offer)
    .innerJoin(offerItem, and(eq(offerItem.offerId, offer.id), eq(offerItem.side, "give")))
    .where(
      and(
        eq(offer.conversationId, conversationId),
        eq(offer.status, "open"),
        eq(offer.toUserId, me),
        gt(offer.expiresAt, sql`now()`),
      ),
    );
  if (rows.length === 0) return null;
  return {
    offerId: rows[0]!.offerId,
    objekts: new Map(rows.flatMap((row) => (row.objektId ? [[row.objektId, row.slug]] : []))),
  };
}

/** Collections on the user's want lists; `discoverableOnly` for someone else's. */
export async function wantSlugsOf(userId: string, discoverableOnly: boolean) {
  const rows = await db
    .selectDistinct({ slug: listEntries.collectionSlug })
    .from(listEntries)
    .innerJoin(lists, eq(lists.id, listEntries.listId))
    .where(
      and(
        eq(lists.userId, userId),
        eq(lists.listTypeNew, "want"),
        discoverableOnly ? eq(lists.discoverable, true) : undefined,
      ),
    );
  return rows.flatMap((row) => (row.slug ? [row.slug] : []));
}

export async function wantListOf(slug: string) {
  const [list] = await db
    .select({
      id: lists.id,
      userId: lists.userId,
      listTypeNew: lists.listTypeNew,
      discoverable: lists.discoverable,
    })
    .from(lists)
    .where(eq(lists.slug, slug));
  if (!list) return { list: null, slugs: [] };
  const rows = await db
    .select({ slug: listEntries.collectionSlug })
    .from(listEntries)
    .where(eq(listEntries.listId, list.id));
  return { list, slugs: rows.flatMap((row) => (row.slug ? [row.slug] : [])) };
}
