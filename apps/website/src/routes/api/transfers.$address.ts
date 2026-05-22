import { validArtists, validOnlineTypes } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt, mapTransfer } from "@repo/lib/server/objekt";
import { fetchKnownAddresses, fetchUserProfiles } from "@repo/lib/server/user";
import { createFileRoute } from "@tanstack/react-router";
import { type SQL, and, desc, eq, inArray, lt, lte, ne, or } from "drizzle-orm";
import * as z from "zod";

import { getSession } from "@/lib/server/auth.server";
import { getCollectionColumns } from "@/lib/server/objekt.server";
import { validType } from "@/lib/universal/transfers";

const PER_PAGE = 150;

const transfersSchema = z.object({
  type: z.enum(validType).default("all"),
  artist: z.enum(validArtists).array(),
  member: z.string().array(),
  season: z.string().array(),
  class: z.string().array(),
  on_offline: z.enum(validOnlineTypes).array(),
  collection: z.string().array(),
  at: z.iso.datetime({ offset: true }).optional(),
  cursor: z
    .object({
      timestamp: z.string(),
      id: z.string(),
    })
    .optional(),
});

type TransferParams = z.infer<typeof transfersSchema>;

function getCollectionFilters(query: TransferParams): SQL[] {
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

export const Route = createFileRoute("/api/transfers/$address")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await getSession();
        const url = new URL(request.url);
        const query = parseParams(url.searchParams);

        const owner = await db.query.userAddress.findFirst({
          where: { address: params.address },
          columns: {
            privateProfile: true,
            hideTransfer: true,
          },
          orderBy: {
            id: "desc",
          },
        });

        const isPrivate = (owner?.privateProfile ?? false) || (owner?.hideTransfer ?? false);

        if (!session && isPrivate)
          return Response.json({
            hide: true,
            results: [],
          });

        if (session && isPrivate) {
          const profiles = await fetchUserProfiles(session.user.id);

          const isProfileAuthed = profiles.some(
            (a) => a.address.toLowerCase() === params.address.toLowerCase(),
          );

          if (!isProfileAuthed)
            return Response.json({
              hide: true,
              results: [],
            });
        }

        const addr = params.address.toLowerCase();

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

        const addressesUnique = Array.from(new Set(addresses));

        const knownAddresses = await fetchKnownAddresses(addressesUnique);

        const addressMap = new Map(knownAddresses.map((a) => [a.address.toLowerCase(), a]));

        return Response.json({
          nextCursor,
          results: slicedResults.map((row) => {
            const fromAddr = addressMap.get(row.transfer.from.toLowerCase());
            const toAddr = addressMap.get(row.transfer.to.toLowerCase());

            return {
              transfer: mapTransfer(row.transfer),
              objekt: mapOwnedObjekt(row.objekt, row.collection),
              nickname: {
                from: fromAddr?.hideNickname ? undefined : (fromAddr?.nickname ?? undefined),
                to: toAddr?.hideNickname ? undefined : (toAddr?.nickname ?? undefined),
              },
            };
          }),
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
  },
  objekt: objekts,
  collection: getCollectionColumns(),
};

function getTypeFilters(type: TransferParams["type"], addr: string): SQL[] {
  const filters: Record<TransferParams["type"], SQL[] | null> = {
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

async function fetchTransfers(query: TransferParams, addr: string) {
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

  // Fast existence check — avoids query planning when no collections match
  if (collectionFilters.length > 0) {
    const exists = await indexer
      .select({ id: collections.id })
      .from(collections)
      .where(and(ne(collections.slug, "empty-collection"), ...collectionFilters))
      .limit(1);
    if (exists.length === 0) return [];
  }

  const baseWhere = and(
    ...cursorFilter,
    ...tsFilter,
    ne(collections.slug, "empty-collection"),
    ...collectionFilters,
  );

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
    // Split OR into two parallel queries for index efficiency
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

function parseParams(params: URLSearchParams): TransferParams {
  const result = transfersSchema.safeParse({
    type: params.get("type") ?? "all",
    artist: params.getAll("artist"),
    member: params.getAll("member"),
    season: params.getAll("season"),
    class: params.getAll("class"),
    on_offline: params.getAll("on_offline"),
    collection: params.getAll("collection"),
    at: params.get("at") ?? undefined,
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
