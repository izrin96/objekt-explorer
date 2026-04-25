import { validArtists, validOnlineTypes } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt, mapTransfer } from "@repo/lib/server/objekt";
import { fetchKnownAddresses } from "@repo/lib/server/user";
import { createFileRoute } from "@tanstack/react-router";
import { type SQL, and, desc, eq, inArray, lt, ne } from "drizzle-orm";
import * as z from "zod";

import { getCollectionColumns } from "@/lib/server/objekt.server";
import { validType } from "@/lib/universal/activity";

const PAGE_SIZE = 300;
const ENABLE_INARRAY = true;

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
      timestamp: z.string().nullish(),
      id: z.string(),
    })
    .optional(),
});

type ActivityParams = z.infer<typeof activitySchema>;

function getCollectionFilters(query: ActivityParams): SQL[] {
  const filters: SQL[] = [];
  if (query.artist.length)
    filters.push(
      inArray(
        collections.artist,
        query.artist.map((a) => a.toLowerCase()),
      ),
    );
  if (query.member.length) filters.push(inArray(collections.member, query.member));
  if (query.season.length) filters.push(inArray(collections.season, query.season));
  if (query.class.length) filters.push(inArray(collections.class, query.class));
  if (query.on_offline.length) filters.push(inArray(collections.onOffline, query.on_offline));
  if (query.collection.length) filters.push(inArray(collections.collectionNo, query.collection));
  return filters;
}

export const Route = createFileRoute("/api/activity")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = parseParams(url.searchParams);

        const transferResults = await fetchTransfers(query);

        const slicedResults = transferResults.slice(0, PAGE_SIZE);

        const addresses = slicedResults.flatMap((r) => [r.transfer.from, r.transfer.to]);

        const addressesUnique = Array.from(new Set(addresses));

        const knownAddresses = await fetchKnownAddresses(addressesUnique);

        const addressMap = new Map(knownAddresses.map((a) => [a.address.toLowerCase(), a]));

        const items = slicedResults.map((t) => {
          const from = addressMap.get(t.transfer.from.toLowerCase());
          const to = addressMap.get(t.transfer.to.toLowerCase());

          return {
            nickname: {
              from: from?.hideNickname ? undefined : (from?.nickname ?? undefined),
              to: to?.hideNickname ? undefined : (to?.nickname ?? undefined),
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

        return Response.json({
          items,
          nextCursor,
        });
      },
    },
  },
});

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

function getTypeFilters(type: ActivityParams["type"]): SQL[] {
  const typeFilters = {
    mint: [eq(transfers.from, Addresses.NULL)],
    transfer: [ne(transfers.from, Addresses.NULL), ne(transfers.to, Addresses.SPIN)],
    spin: [eq(transfers.to, Addresses.SPIN)],
    all: [],
  };
  return typeFilters[type];
}

async function fetchTransfers(query: ActivityParams) {
  const typeFilters = getTypeFilters(query.type);
  const cursorFilter = query.cursor
    ? [
        ...(query.cursor.timestamp ? [lt(transfers.timestamp, query.cursor.timestamp)] : []),
        lt(transfers.id, query.cursor.id),
      ]
    : [];

  const collectionFilters = getCollectionFilters(query);

  if (collectionFilters.length > 0) {
    const matchingCollections = await indexer
      .select({ id: collections.id })
      .from(collections)
      .where(and(ne(collections.slug, "empty-collection"), ...collectionFilters));

    if (matchingCollections.length === 0) return [];

    if (ENABLE_INARRAY) {
      const collectionIds = matchingCollections.map((c) => c.id);

      const ids = await indexer
        .select({ id: transfers.id })
        .from(transfers)
        .where(and(inArray(transfers.collectionId, collectionIds), ...cursorFilter, ...typeFilters))
        .orderBy(desc(transfers.timestamp), desc(transfers.id))
        .limit(PAGE_SIZE + 1);

      if (ids.length === 0) return [];

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
        .orderBy(desc(transfers.timestamp), desc(transfers.id));
    }

    const ids = await indexer
      .select({ id: transfers.id })
      .from(transfers)
      .innerJoin(collections, eq(transfers.collectionId, collections.id))
      .where(
        and(
          ...cursorFilter,
          ...typeFilters,
          ...collectionFilters,
          ne(collections.slug, "empty-collection"),
        ),
      )
      .orderBy(desc(transfers.timestamp), desc(transfers.id))
      .limit(PAGE_SIZE + 1);

    if (ids.length === 0) return [];

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
      .orderBy(desc(transfers.timestamp), desc(transfers.id));
  }

  // No collection filters — scan transfer index directly
  return indexer
    .select(transferSelect)
    .from(transfers)
    .innerJoin(objekts, eq(transfers.objektId, objekts.id))
    .innerJoin(collections, eq(transfers.collectionId, collections.id))
    .where(and(...cursorFilter, ...typeFilters, ne(collections.slug, "empty-collection")))
    .orderBy(desc(transfers.timestamp), desc(transfers.id))
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
