import { toIndexedArtist } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt, mapTransfer } from "@repo/lib/server/objekt";
import { fetchPublicNicknames } from "@repo/lib/server/user";
import { type SQL, and, arrayOverlaps, desc, eq, inArray, lt, lte, ne, or } from "drizzle-orm";

import type { TransferResult, TransfersQuery } from "../schemas/transfers";
import { getCollectionColumns } from "./objekt";
import { isAddressHiddenFromCaller } from "./privacy";

const PER_PAGE = 150;

export async function fetchAddressTransfers(
  address: string,
  query: TransfersQuery,
): Promise<TransferResult> {
  const addr = address.toLowerCase();

  if (await isAddressHiddenFromCaller(addr, { checkHideTransfer: true })) {
    return { hide: true, results: [] };
  }

  const results = await fetchTransfers(query, addr);

  const hasNext = results.length > PER_PAGE;
  const nextCursor = hasNext
    ? {
        timestamp: new Date(results[PER_PAGE - 1]!.transfer.timestamp).toISOString(),
        id: results[PER_PAGE - 1]!.transfer.id,
      }
    : undefined;
  const slicedResults = results.slice(0, PER_PAGE);

  const addresses = slicedResults.flatMap((r) => [r.transfer.from, r.transfer.to]);

  const nicknameOf = await fetchPublicNicknames(Array.from(new Set(addresses)));

  return {
    nextCursor,
    results: slicedResults.map((row) => {
      return {
        transfer: mapTransfer(row.transfer),
        objekt: mapOwnedObjekt(row.objekt, row.collection),
        nickname: {
          from: nicknameOf(row.transfer.from),
          to: nicknameOf(row.transfer.to),
        },
      };
    }),
  };
}

function getCollectionFilters(query: TransfersQuery): SQL[] {
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
  },
  objekt: objekts,
  collection: getCollectionColumns(),
};

function getTypeFilters(type: TransfersQuery["type"], addr: string): SQL[] {
  const filters: Record<TransfersQuery["type"], SQL[] | null> = {
    all: null,
    mint: [eq(transfers.from, Addresses.NULL), eq(transfers.to, addr)],
    received: [ne(transfers.from, Addresses.NULL), eq(transfers.to, addr)],
    sent: [eq(transfers.from, addr), ne(transfers.to, Addresses.SPIN)],
    spin: [eq(transfers.from, addr), eq(transfers.to, Addresses.SPIN)],
  };
  const result = filters[type];
  if (result === undefined) throw new Error(`Unknown transfer type: ${type}`);
  return result ?? [];
}

async function fetchTransfers(query: TransfersQuery, addr: string) {
  const typeFilters = getTypeFilters(query.type, addr);
  const cursorFilter = query.cursor
    ? [
        or(
          lt(transfers.timestamp, query.cursor.timestamp),
          and(eq(transfers.timestamp, query.cursor.timestamp), lt(transfers.id, query.cursor.id)),
        ),
      ]
    : [];
  const tsFilter = query.at ? [lte(transfers.timestamp, query.at)] : [];
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

    const getIds = (...addressFilters: (SQL | undefined)[]) =>
      indexer
        .select({ transfer: { id: transfers.id, timestamp: transfers.timestamp } })
        .from(transfers)
        .where(
          and(
            ...addressFilters,
            ...cursorFilter,
            ...tsFilter,
            inArray(transfers.collectionId, collectionSubquery),
          ),
        )
        .orderBy(desc(transfers.timestamp), desc(transfers.id))
        .limit(PER_PAGE + 1);

    let ids: { transfer: { id: string; timestamp: string } }[];

    if (query.type === "all") {
      const [fromIds, toIds] = await Promise.all([
        getIds(eq(transfers.from, addr)),
        getIds(eq(transfers.to, addr)),
      ]);
      ids = mergeSortedTransfers(fromIds, toIds, PER_PAGE + 1);
    } else {
      ids = await getIds(...typeFilters);
    }

    if (ids.length === 0) return [];

    return indexer
      .select(transferSelect)
      .from(transfers)
      .innerJoin(objekts, eq(transfers.objektId, objekts.id))
      .innerJoin(collections, eq(transfers.collectionId, collections.id))
      .where(
        inArray(
          transfers.id,
          ids.map((t) => t.transfer.id),
        ),
      )
      .orderBy(desc(transfers.timestamp), desc(transfers.id));
  }

  // No collection filters — planner can use partial indexes directly
  const baseWhere = and(...cursorFilter, ...tsFilter, ne(collections.slug, "empty-collection"));

  const queryFn = (...addressFilters: (SQL | undefined)[]) =>
    indexer
      .select(transferSelect)
      .from(transfers)
      .innerJoin(objekts, eq(transfers.objektId, objekts.id))
      .innerJoin(collections, eq(transfers.collectionId, collections.id))
      .where(and(...addressFilters, baseWhere))
      .orderBy(desc(transfers.timestamp), desc(transfers.id))
      .limit(PER_PAGE + 1);

  if (query.type === "all") {
    const [fromResults, toResults] = await Promise.all([
      queryFn(eq(transfers.from, addr)),
      queryFn(eq(transfers.to, addr)),
    ]);
    return mergeSortedTransfers(fromResults, toResults, PER_PAGE + 1);
  }

  return queryFn(...typeFilters);
}

/** Merge two arrays sorted by (timestamp DESC, id DESC), deduplicate, return top `limit` */
function mergeSortedTransfers<T extends { transfer: { id: string; timestamp: string } }>(
  a: T[],
  b: T[],
  limit: number,
): T[] {
  const result: T[] = [];
  let i = 0;
  let j = 0;

  while (result.length < limit && (i < a.length || j < b.length)) {
    const aVal = a[i];
    const bVal = b[j];

    let next: T;
    if (j >= b.length) {
      next = a[i++]!;
    } else if (i >= a.length) {
      next = b[j++]!;
    } else if (
      aVal!.transfer.timestamp > bVal!.transfer.timestamp ||
      (aVal!.transfer.timestamp === bVal!.transfer.timestamp &&
        aVal!.transfer.id >= bVal!.transfer.id)
    ) {
      next = a[i++]!;
    } else {
      next = b[j++]!;
    }

    if (result.at(-1)?.transfer.id !== next.transfer.id) {
      result.push(next);
    }
  }

  return result;
}
