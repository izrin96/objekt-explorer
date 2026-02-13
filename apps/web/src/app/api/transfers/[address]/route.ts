import type { NextRequest } from "next/server";

import { validArtists, validOnlineTypes } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import { fetchKnownAddresses, fetchUserProfiles } from "@repo/lib/server/user";
import { isValid, parseISO } from "date-fns";
import { type SQL, and, desc, eq, inArray, lt, lte, ne } from "drizzle-orm";
import * as z from "zod";

import { getSession } from "@/lib/server/auth";
import { getCollectionColumns } from "@/lib/server/objekt";
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
  at: z.string().optional(),
  cursor: z
    .object({
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

export async function GET(request: NextRequest, props: { params: Promise<{ address: string }> }) {
  const [session, params] = await Promise.all([getSession(), props.params]);
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);

  const owner = await db.query.userAddress.findFirst({
    where: { address: params.address },
    columns: {
      privateProfile: true,
      hideTransfer: true,
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

  const targetTimestamp = query.at ? parseISO(query.at) : undefined;
  if (targetTimestamp && !isValid(targetTimestamp)) {
    return Response.json({ nextCursor: undefined, results: [] });
  }

  const transferSelect = {
    transfer: {
      id: transfers.id,
      from: transfers.from,
      to: transfers.to,
      timestamp: transfers.timestamp,
    },
    objekt: objekts,
    collection: {
      ...getCollectionColumns(),
    },
  };

  const collectionFilters = getCollectionFilters(query);
  const cursorFilter = query.cursor ? [lt(transfers.id, query.cursor.id)] : [];
  const tsFilter = targetTimestamp ? [lte(transfers.timestamp, targetTimestamp)] : [];

  const typeFilters = {
    all: null,
    mint: [eq(transfers.from, Addresses.NULL), eq(transfers.to, addr)],
    received: [ne(transfers.from, Addresses.NULL), eq(transfers.to, addr)],
    sent: [eq(transfers.from, addr), ne(transfers.to, Addresses.SPIN)],
    spin: [eq(transfers.from, addr), eq(transfers.to, Addresses.SPIN)],
  };

  const runQuery = (...addressFilters: (SQL | undefined)[]) =>
    indexer
      .select(transferSelect)
      .from(transfers)
      .innerJoin(objekts, eq(transfers.objektId, objekts.id))
      .innerJoin(collections, eq(transfers.collectionId, collections.id))
      .where(
        and(
          ...addressFilters,
          ...cursorFilter,
          ...tsFilter,
          ne(collections.slug, "empty-collection"),
        ),
      )
      .orderBy(desc(transfers.id))
      .limit(PER_PAGE + 1);

  let results: Awaited<ReturnType<typeof runQuery>>;

  if (collectionFilters.length > 0) {
    // Use JOIN instead of IN for better performance with many collections
    // Pre-fetch matching collection IDs only if the list is small (< 50)
    // Otherwise use JOIN directly in the transfer query
    const getIds = (...addressFilters: (SQL | undefined)[]) =>
      indexer
        .select({ id: transfers.id })
        .from(transfers)
        .innerJoin(
          collections,
          and(
            eq(collections.id, transfers.collectionId),
            ne(collections.slug, "empty-collection"),
            ...collectionFilters,
          ),
        )
        .where(and(...addressFilters, ...cursorFilter, ...tsFilter))
        .orderBy(desc(transfers.id))
        .limit(PER_PAGE + 1);

    let ids: { id: string }[];

    if (query.type === "all") {
      const [fromIds, toIds] = await Promise.all([
        getIds(eq(transfers.from, addr)),
        getIds(eq(transfers.to, addr)),
      ]);
      ids = mergeSortedTransfers(
        fromIds.map((r) => ({ transfer: r })),
        toIds.map((r) => ({ transfer: r })),
        PER_PAGE + 1,
      ).map((r) => r.transfer);
    } else {
      ids = await getIds(...typeFilters[query.type]!);
    }

    if (ids.length === 0) {
      return Response.json({ nextCursor: undefined, results: [] });
    }

    results = await indexer
      .select(transferSelect)
      .from(transfers)
      .innerJoin(objekts, eq(transfers.objektId, objekts.id))
      .innerJoin(collections, eq(transfers.collectionId, collections.id))
      .where(
        inArray(
          transfers.id,
          ids.map((r) => r.id),
        ),
      )
      .orderBy(desc(transfers.id));
  } else if (query.type === "all") {
    // No collection filters — split OR into two parallel queries
    const [fromResults, toResults] = await Promise.all([
      runQuery(eq(transfers.from, addr)),
      runQuery(eq(transfers.to, addr)),
    ]);
    results = mergeSortedTransfers(fromResults, toResults, PER_PAGE + 1);
  } else {
    results = await runQuery(...typeFilters[query.type]!);
  }

  const hasNext = results.length > PER_PAGE;
  const nextCursor = hasNext
    ? {
        id: results[PER_PAGE - 1]!.transfer.id,
      }
    : undefined;
  const slicedResults = results.slice(0, PER_PAGE);

  const addresses = slicedResults.flatMap((r) => [r.transfer.from, r.transfer.to]);

  const addressesUnique = Array.from(new Set(addresses));

  const knownAddresses = await fetchKnownAddresses(addressesUnique);

  return Response.json({
    nextCursor,
    results: slicedResults.map((row) => ({
      transfer: row.transfer,
      objekt: mapOwnedObjekt(row.objekt, row.collection),
      nickname: {
        from: knownAddresses.find(
          (a) => row.transfer.from.toLowerCase() === a.address.toLowerCase() && !a.hideNickname,
        )?.nickname,
        to: knownAddresses.find(
          (a) => row.transfer.to.toLowerCase() === a.address.toLowerCase() && !a.hideNickname,
        )?.nickname,
      },
    })),
  });
}

/** Merge two arrays sorted by transfer.id DESC, deduplicate, return top `limit` */
function mergeSortedTransfers<T extends { transfer: { id: string } }>(
  a: T[],
  b: T[],
  limit: number,
): T[] {
  const result: T[] = [];
  let i = 0;
  let j = 0;

  while (result.length < limit && (i < a.length || j < b.length)) {
    const next =
      j >= b.length || (i < a.length && a[i]!.transfer.id >= b[j]!.transfer.id) ? a[i++]! : b[j++]!;

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
