import { toIndexedArtist } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import type { HeldObjekt } from "@repo/lib/types/objekt";
import { and, asc, count, desc, eq, getColumns, inArray, lt, lte, ne, or, sql } from "drizzle-orm";

import type { HeldByOutput, OwnedByFilters, OwnedByOutput } from "../schemas/objekts";
import { getCollectionColumns } from "./objekt";
import { isAddressHiddenFromCaller } from "./privacy";
import { getCache } from "./redis";

const PER_PAGE = 8000;
const ENABLE_COUNT = false;

function buildCollectionFilters(query: OwnedByFilters) {
  if (!query.artist?.length) return [];
  return [inArray(collections.artist, query.artist.map(toIndexedArtist))];
}

function cursorWhere(query: OwnedByFilters) {
  if (!query.cursor) return undefined;
  return or(
    lt(objekts.receivedAt, query.cursor.receivedAt),
    and(eq(objekts.receivedAt, query.cursor.receivedAt), lt(objekts.id, query.cursor.id)),
  );
}

function cursorAfter(lastResult: { objekt: { receivedAt: Date | string; id: string } }) {
  return {
    receivedAt: new Date(lastResult.objekt.receivedAt).toISOString(),
    id: lastResult.objekt.id,
  };
}

const ORDER_BY = [desc(objekts.receivedAt), desc(objekts.id)];

/** Spin's past state means replaying millions of transfers, so it has no checkpoint. */
export function isCheckpointUnavailable(address: string, query: OwnedByFilters): boolean {
  return !!query.at && address.toLowerCase() === Addresses.SPIN;
}

export async function fetchOwnedObjekts(
  address: string,
  query: OwnedByFilters,
): Promise<OwnedByOutput> {
  const addr = address.toLowerCase();

  if (await isAddressHiddenFromCaller(addr)) {
    return { objekts: [] };
  }

  const collectionFilters = buildCollectionFilters(query);
  const isFirstPage = !query.cursor;

  if (query.at) {
    const latest = indexer.$with("latest").as(
      indexer
        .selectDistinctOn([transfers.objektId], {
          objektId: transfers.objektId,
          to: transfers.to,
          timestamp: transfers.timestamp,
        })
        .from(transfers)
        .where(
          and(
            lte(transfers.timestamp, query.at),
            or(eq(transfers.from, addr), eq(transfers.to, addr)),
          ),
        )
        .orderBy(transfers.objektId, desc(transfers.timestamp)),
    );

    const mainQuery = indexer
      .with(latest)
      .select({
        objekt: {
          ...getColumns(objekts),
          receivedAt: latest.timestamp,
        },
        collection: getCollectionColumns(),
      })
      .from(latest)
      .innerJoin(objekts, eq(latest.objektId, objekts.id))
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          eq(latest.to, addr),
          ne(collections.slug, "empty-collection"),
          ...collectionFilters,
          cursorWhere(query),
        ),
      )
      .orderBy(...ORDER_BY)
      .limit(PER_PAGE + 1);

    const countQuery =
      ENABLE_COUNT && isFirstPage
        ? indexer
            .with(latest)
            .select({ count: count() })
            .from(latest)
            .innerJoin(objekts, eq(latest.objektId, objekts.id))
            .innerJoin(collections, eq(collections.id, objekts.collectionId))
            .where(
              and(
                eq(latest.to, addr),
                ne(collections.slug, "empty-collection"),
                ...collectionFilters,
              ),
            )
        : null;

    const [results, countResult] = await Promise.all([mainQuery, countQuery]);

    const hasNext = results.length > PER_PAGE;
    const nextCursor = hasNext ? cursorAfter(results[PER_PAGE - 1]!) : undefined;
    const total = countResult ? (countResult[0]?.count ?? 0) : undefined;

    return {
      nextCursor,
      objekts: results.slice(0, PER_PAGE).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
      total,
    };
  }

  const mainQuery = indexer
    .select({
      objekt: objekts,
      collection: getCollectionColumns(),
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.owner, addr),
        ne(collections.slug, "empty-collection"),
        ...collectionFilters,
        cursorWhere(query),
      ),
    )
    .orderBy(...ORDER_BY)
    .limit(PER_PAGE + 1);

  const countQuery =
    ENABLE_COUNT && isFirstPage
      ? indexer
          .select({ count: count() })
          .from(objekts)
          .innerJoin(collections, eq(objekts.collectionId, collections.id))
          .where(
            and(
              eq(objekts.owner, addr),
              ne(collections.slug, "empty-collection"),
              ...collectionFilters,
            ),
          )
      : null;

  const [results, countResult] = await Promise.all([mainQuery, countQuery]);
  const total = countResult ? (countResult[0]?.count ?? 0) : undefined;

  const hasNext = results.length > PER_PAGE;
  const nextCursor = hasNext ? cursorAfter(results[PER_PAGE - 1]!) : undefined;

  return {
    nextCursor,
    objekts: results.slice(0, PER_PAGE).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
    total,
  };
}

const CACHE_TTL = 60 * 5;

/**
 * Held copies counted per collection, for an owner too large to list token by
 * token (COSMO Spin holds millions). Copies are grouped before the join, so
 * only one row per collection meets the collection table; the lowest-serial
 * token is one indexed probe per collection, not a sort of every token.
 */
async function countHeld(addr: string): Promise<HeldObjekt[]> {
  const held = indexer.$with("held").as(
    indexer
      .select({
        collectionId: objekts.collectionId,
        copies: count().as("copies"),
        minSerial: sql<number>`min(${objekts.serial})`.as("min_serial"),
        firstReceivedAt: sql<string | Date>`min(${objekts.receivedAt})`.as("first_received_at"),
      })
      .from(objekts)
      .where(eq(objekts.owner, addr))
      .groupBy(objekts.collectionId),
  );

  // (collection_id, serial) is not unique, so the lowest ID makes a tie deterministic
  const first = indexer
    .select({ id: objekts.id })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, held.collectionId),
        eq(objekts.serial, held.minSerial),
        eq(objekts.owner, addr),
      ),
    )
    .orderBy(asc(objekts.id))
    .limit(1)
    .as("first");

  const results = await indexer
    .with(held)
    .select({
      collection: getCollectionColumns(),
      copies: held.copies,
      minSerial: held.minSerial,
      firstReceivedAt: held.firstReceivedAt,
      minSerialTokenId: first.id,
    })
    .from(held)
    .innerJoin(collections, eq(collections.id, held.collectionId))
    .innerJoinLateral(first, sql`true`)
    .where(ne(collections.slug, "empty-collection"));

  return results.map((row): HeldObjekt =>
    Object.assign(overrideCollection(row.collection), {
      copies: row.copies,
      minSerial: row.minSerial,
      minSerialTokenId: row.minSerialTokenId,
      firstReceivedAt: new Date(row.firstReceivedAt).toISOString(),
    }),
  );
}

export async function fetchHeldObjekts(
  address: string,
  artist: OwnedByFilters["artist"],
): Promise<HeldByOutput> {
  const addr = address.toLowerCase();

  if (await isAddressHiddenFromCaller(addr)) {
    return { collections: [] };
  }

  // only Spin's pass is slow enough to cache; one entry whatever the artist scope
  const all =
    addr === Addresses.SPIN
      ? await getCache(`held-by:v2:${addr}`, CACHE_TTL, () => countHeld(addr))
      : await countHeld(addr);
  const artists = artist?.map((a) => a.toLowerCase());

  return {
    collections: artists?.length
      ? all.filter((collection) => artists.includes(collection.artist.toLowerCase()))
      : all,
  };
}
