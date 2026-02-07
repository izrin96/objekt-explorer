import { validArtists, validOnlineTypes } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchKnownAddresses } from "@repo/lib/server/user";
import { type SQL, and, desc, eq, inArray, lt, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { resolveCollectionIds } from "@/lib/server/collection";
import { getCollectionColumns } from "@/lib/server/objekt";
import { validType } from "@/lib/universal/activity";

const PAGE_SIZE = 300;

const activitySchema = z.object({
  type: z.enum(validType).default("all"),
  artist: z.enum(validArtists).array(),
  member: z.string().array(),
  season: z.string().array(),
  class: z.string().array(),
  on_offline: z.enum(validOnlineTypes).array(),
  collection: z.string().array(),
  cursor: z
    .object({
      id: z.string(),
    })
    .optional(),
});

type ActivityParams = z.infer<typeof activitySchema>;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);

  const matchingCollectionIds = await resolveCollectionIds(query);

  if (matchingCollectionIds !== null && matchingCollectionIds.length === 0) {
    return NextResponse.json({ items: [], nextCursor: undefined });
  }

  const transferResults = await fetchTransfers(query, matchingCollectionIds);

  const slicedResults = transferResults.slice(0, PAGE_SIZE);

  const addresses = slicedResults.flatMap((r) => [r.transfer.from, r.transfer.to]);

  const addressesUnique = Array.from(new Set(addresses));

  const knownAddresses = await fetchKnownAddresses(addressesUnique);

  const items = slicedResults.map((t) => {
    const from = knownAddresses.find(
      (a) => a.address.toLowerCase() === t.transfer.from.toLowerCase(),
    );
    const to = knownAddresses.find((a) => a.address.toLowerCase() === t.transfer.to.toLowerCase());

    return {
      nickname: {
        from: from?.hideNickname ? undefined : from?.nickname,
        to: to?.hideNickname ? undefined : to?.nickname,
      },
      transfer: t.transfer,
      objekt: mapOwnedObjekt(t.objekt, t.collection),
    };
  });

  const hasNextPage = transferResults.length > PAGE_SIZE;
  const nextCursor = hasNextPage
    ? {
        id: transferResults[PAGE_SIZE - 1]!.transfer.id,
      }
    : undefined;

  return NextResponse.json({
    items,
    nextCursor,
  });
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
  collection: {
    ...getCollectionColumns(),
  },
};

function getTypeFilters(type: ActivityParams["type"]): SQL[] {
  const typeFilters = {
    mint: [eq(transfers.from, Addresses.NULL)],
    transfer: [ne(transfers.from, Addresses.NULL), ne(transfers.to, Addresses.SPIN)],
    spin: [eq(transfers.to, Addresses.SPIN)],
    all: [],
  };
  return typeFilters[type];
}

async function fetchTransfers(query: ActivityParams, matchingCollectionIds: string[] | null) {
  const typeFilters = getTypeFilters(query.type);
  const cursorFilter = query.cursor ? [lt(transfers.id, query.cursor.id)] : [];

  if (matchingCollectionIds !== null) {
    // lean scan on transfer table only — forces (collection_id, id DESC) index
    const ids = await indexer
      .select({ id: transfers.id })
      .from(transfers)
      .where(
        and(
          ...cursorFilter,
          ...typeFilters,
          inArray(transfers.collectionId, matchingCollectionIds),
        ),
      )
      .orderBy(desc(transfers.id))
      .limit(PAGE_SIZE + 1);

    if (ids.length === 0) return [];

    // full fetch by PK for matched IDs
    return indexer
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
      .orderBy(desc(transfers.id));
  }

  // no collection filters — PK scan is already optimal
  return indexer
    .select(transferSelect)
    .from(transfers)
    .innerJoin(objekts, eq(transfers.objektId, objekts.id))
    .innerJoin(collections, eq(transfers.collectionId, collections.id))
    .where(and(...cursorFilter, ...typeFilters, ne(collections.slug, "empty-collection")))
    .orderBy(desc(transfers.id))
    .limit(PAGE_SIZE + 1);
}

function parseParams(params: URLSearchParams): ActivityParams {
  const result = activitySchema.safeParse({
    type: params.get("type") ?? "all",
    artist: params.getAll("artist"),
    member: params.getAll("member"),
    season: params.getAll("season"),
    class: params.getAll("class"),
    on_offline: params.getAll("on_offline"),
    collection: params.getAll("collection"),
    cursor: params.get("cursor") ? JSON.parse(params.get("cursor")!) : undefined,
  });

  return result.success
    ? result.data
    : {
        type: "all",
        artist: [],
        member: [],
        season: [],
        class: [],
        on_offline: [],
        collection: [],
        cursor: undefined,
      };
}
