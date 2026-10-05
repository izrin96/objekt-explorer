import { toIndexedArtist } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt, mapTransfer } from "@repo/lib/server/objekt";
import { fetchPublicNicknames } from "@repo/lib/server/user";
import { type SQL, and, arrayOverlaps, desc, eq, inArray, lt, ne, or } from "drizzle-orm";

import type { ActivityQuery, ActivityResponse } from "../schemas/activity";
import { getCollectionColumns } from "./objekt";

const PAGE_SIZE = 300;

export async function fetchActivityPage(query: ActivityQuery): Promise<ActivityResponse> {
  const transferResults = await fetchTransfers(query);

  const slicedResults = transferResults.slice(0, PAGE_SIZE);

  const addresses = slicedResults.flatMap((r) => [r.transfer.from, r.transfer.to]);

  const nicknameOf = await fetchPublicNicknames(Array.from(new Set(addresses)));

  const items = slicedResults.map((t) => {
    return {
      nickname: {
        from: nicknameOf(t.transfer.from),
        to: nicknameOf(t.transfer.to),
      },
      transfer: mapTransfer(t.transfer),
      objekt: mapOwnedObjekt(t.objekt, t.collection),
    };
  });

  const hasNextPage = transferResults.length > PAGE_SIZE;
  const nextCursor = hasNextPage
    ? {
        timestamp: new Date(transferResults[PAGE_SIZE - 1]!.transfer.timestamp).toISOString(),
        id: transferResults[PAGE_SIZE - 1]!.transfer.id,
      }
    : undefined;

  return { items, nextCursor };
}

function getCollectionFilters(query: ActivityQuery): SQL[] {
  const filters: SQL[] = [];
  if (query.artist.length)
    filters.push(inArray(collections.artist, query.artist.map(toIndexedArtist)));
  if (query.member.length) filters.push(arrayOverlaps(collections.members, query.member));
  if (query.season.length) filters.push(inArray(collections.season, query.season));
  if (query.class.length) filters.push(inArray(collections.class, query.class));
  if (query.on_offline.length) filters.push(inArray(collections.onOffline, query.on_offline));
  if (query.collection.length) filters.push(inArray(collections.collectionNo, query.collection));
  return filters;
}

const transferSelect = {
  transfer: {
    id: transfers.id,
    from: transfers.from,
    to: transfers.to,
    timestamp: transfers.timestamp,
    hash: transfers.hash,
  },
  objekt: objekts,
  collection: getCollectionColumns(),
};

function getTypeFilters(type: ActivityQuery["type"]): SQL[] {
  const typeFilters = {
    mint: [eq(transfers.from, Addresses.NULL)],
    transfer: [ne(transfers.from, Addresses.NULL), ne(transfers.to, Addresses.SPIN)],
    spin: [eq(transfers.to, Addresses.SPIN)],
    all: [],
  };
  return typeFilters[type];
}

async function fetchTransfers(query: ActivityQuery) {
  const typeFilters = getTypeFilters(query.type);
  const cursorFilter = query.cursor
    ? [
        or(
          lt(transfers.timestamp, query.cursor.timestamp),
          and(eq(transfers.timestamp, query.cursor.timestamp), lt(transfers.id, query.cursor.id)),
        ),
      ]
    : [];

  const collectionFilters = getCollectionFilters(query);

  // When collection filters are present, use a subquery to let PostgreSQL
  // optimize the join instead of materializing hundreds of UUIDs client-side.
  if (collectionFilters.length > 0) {
    const collectionSubquery = indexer
      .select({ id: collections.id })
      .from(collections)
      .where(and(ne(collections.slug, "empty-collection"), ...collectionFilters));

    // Run the collection query first to check if any match,
    // avoids a full scan of transfers when no collections match the filters.
    const matchingCollections = await collectionSubquery;

    if (matchingCollections.length === 0) return [];

    // Step 1: IDs only — subquery lets planner use collection index first,
    // then nested-loop into transfer indexes
    const ids = await indexer
      .select({ id: transfers.id })
      .from(transfers)
      .where(
        and(...cursorFilter, ...typeFilters, inArray(transfers.collectionId, collectionSubquery)),
      )
      .orderBy(desc(transfers.timestamp), desc(transfers.id))
      .limit(PAGE_SIZE + 1);

    if (ids.length === 0) return [];

    // Step 2: Full data for the small result set — JOINs are cheap here
    const results = await indexer
      .select(transferSelect)
      .from(transfers)
      .innerJoin(objekts, eq(transfers.objektId, objekts.id))
      .innerJoin(collections, eq(transfers.collectionId, collections.id))
      .where(
        inArray(
          transfers.id,
          ids.map((t) => t.id),
        ),
      )
      .orderBy(desc(transfers.timestamp), desc(transfers.id));
    return results;
  }

  // No collection filters — planner can use partial indexes directly
  return indexer
    .select(transferSelect)
    .from(transfers)
    .innerJoin(objekts, eq(transfers.objektId, objekts.id))
    .innerJoin(collections, eq(transfers.collectionId, collections.id))
    .where(and(...cursorFilter, ...typeFilters, ne(collections.slug, "empty-collection")))
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
    .limit(PAGE_SIZE + 1);
}
