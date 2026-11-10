import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt, mapTransfer } from "@repo/lib/server/objekt";
import { fetchPublicNicknames } from "@repo/lib/server/user";
import { type SQL, and, asc, desc, eq, inArray, lte, ne, sql } from "drizzle-orm";

import { mergeSortedTransfers } from "../../lib/transfer-merge";
import type { AddressTransfersOutput, AddressTransfersFilters } from "../../schemas/transfers";
import { getCollectionColumns } from "../objekt/collection-columns";
import { collectionScope } from "./feed";
import { withSpinRewards } from "./spin-rewards";

const PER_PAGE = 150;

export async function fetchAddressTransfers(
  address: string,
  query: AddressTransfersFilters,
): Promise<AddressTransfersOutput> {
  const addr = address.toLowerCase();

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
    results: await withSpinRewards(
      slicedResults.map((row) => ({
        transfer: mapTransfer(row.transfer),
        objekt: mapOwnedObjekt(row.objekt, row.collection),
        nickname: {
          from: nicknameOf(row.transfer.from),
          to: nicknameOf(row.transfer.to),
        },
      })),
    ),
  };
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

function getTypeFilters(type: AddressTransfersFilters["type"], addr: string): SQL[] {
  const filters: Record<AddressTransfersFilters["type"], SQL[] | null> = {
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

async function fetchTransfers(query: AddressTransfersFilters, addr: string) {
  const typeFilters = getTypeFilters(query.type, addr);
  const { order } = query;
  const sortBy = order === "desc" ? desc : asc;
  // a row comparison, so the (address, timestamp, id) indexes seek to the cursor; the same test
  // spelled with OR is only a filter, and a deep page walked every row before it
  const past = order === "desc" ? sql`<` : sql`>`;
  const cursorFilter = query.cursor
    ? [
        sql`(${transfers.timestamp}, ${transfers.id}) ${past} (${query.cursor.timestamp}::timestamptz, ${query.cursor.id}::uuid)`,
      ]
    : [];
  const tsFilter = query.at ? [lte(transfers.timestamp, query.at)] : [];
  const scope = await collectionScope(query);
  if (scope === null) return [];

  if (scope) {
    const getIds = (...addressFilters: (SQL | undefined)[]) =>
      indexer
        .select({ transfer: { id: transfers.id, timestamp: transfers.timestamp } })
        .from(transfers)
        .where(
          and(
            ...addressFilters,
            ...cursorFilter,
            ...tsFilter,
            inArray(transfers.collectionId, scope.ids),
          ),
        )
        .orderBy(sortBy(transfers.timestamp), sortBy(transfers.id))
        .limit(PER_PAGE + 1);

    let ids: { transfer: { id: string; timestamp: string } }[];

    if (query.type === "all") {
      const [fromIds, toIds] = await Promise.all([
        getIds(eq(transfers.from, addr)),
        getIds(eq(transfers.to, addr)),
      ]);
      ids = mergeSortedTransfers(fromIds, toIds, PER_PAGE + 1, order);
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
      .orderBy(sortBy(transfers.timestamp), sortBy(transfers.id));
  }

  // No collection filters — planner can use partial indexes directly
  const baseWhere = and(...cursorFilter, ...tsFilter);

  const queryFn = (...addressFilters: (SQL | undefined)[]) =>
    indexer
      .select(transferSelect)
      .from(transfers)
      .innerJoin(objekts, eq(transfers.objektId, objekts.id))
      .innerJoin(collections, eq(transfers.collectionId, collections.id))
      .where(and(...addressFilters, baseWhere))
      .orderBy(sortBy(transfers.timestamp), sortBy(transfers.id))
      .limit(PER_PAGE + 1);

  if (query.type === "all") {
    const [fromResults, toResults] = await Promise.all([
      queryFn(eq(transfers.from, addr)),
      queryFn(eq(transfers.to, addr)),
    ]);
    return mergeSortedTransfers(fromResults, toResults, PER_PAGE + 1, order);
  }

  return queryFn(...typeFilters);
}
