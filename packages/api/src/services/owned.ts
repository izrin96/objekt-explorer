import { toIndexedArtist } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses, chunkMap } from "@repo/lib";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import type { HeldObjekt } from "@repo/lib/types/objekt";
import { and, asc, count, desc, eq, getColumns, inArray, lt, lte, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { HeldByOutput, OwnedByFilters, OwnedByOutput } from "../schemas/objekts";
import { getCollectionColumns } from "./objekt";
import { getCache, redis, redisFailOpen } from "./redis";
import { TOKEN_CHUNK_SIZE } from "./utils";

const PER_PAGE = 8000;

function buildCollectionFilters(query: OwnedByFilters) {
  if (!query.artist?.length) return [];
  return [inArray(collections.artist, query.artist.map(toIndexedArtist))];
}

function cursorWhere(query: OwnedByFilters, receivedAt: AnyPgColumn) {
  if (!query.cursor) return undefined;
  return or(
    lt(receivedAt, query.cursor.receivedAt),
    and(eq(receivedAt, query.cursor.receivedAt), lt(objekts.id, query.cursor.id)),
  );
}

function cursorAfter(lastResult: { objekt: { receivedAt: Date | string; id: string } }) {
  return {
    receivedAt: new Date(lastResult.objekt.receivedAt).toISOString(),
    id: lastResult.objekt.id,
  };
}

const orderBy = (receivedAt: AnyPgColumn) => [desc(receivedAt), desc(objekts.id)];

/** Spin's past state means replaying millions of transfers, so it has no checkpoint. */
export function isCheckpointUnavailable(address: string, query: OwnedByFilters): boolean {
  return !!query.at && address.toLowerCase() === Addresses.SPIN;
}

export async function fetchOwnedObjekts(
  address: string,
  query: OwnedByFilters,
): Promise<OwnedByOutput> {
  const addr = address.toLowerCase();

  const collectionFilters = buildCollectionFilters(query);

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
      .where(and(eq(latest.to, addr), ...collectionFilters, cursorWhere(query, latest.timestamp)))
      .orderBy(...orderBy(latest.timestamp))
      .limit(PER_PAGE + 1);

    const results = await mainQuery;

    const hasNext = results.length > PER_PAGE;
    const nextCursor = hasNext ? cursorAfter(results[PER_PAGE - 1]!) : undefined;

    return {
      nextCursor,
      objekts: results.slice(0, PER_PAGE).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
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
      and(eq(objekts.owner, addr), ...collectionFilters, cursorWhere(query, objekts.receivedAt)),
    )
    .orderBy(...orderBy(objekts.receivedAt))
    .limit(PER_PAGE + 1);

  const results = await mainQuery;

  const hasNext = results.length > PER_PAGE;
  const nextCursor = hasNext ? cursorAfter(results[PER_PAGE - 1]!) : undefined;

  return {
    nextCursor,
    objekts: results.slice(0, PER_PAGE).map((a) => mapOwnedObjekt(a.objekt, a.collection)),
  };
}

const CACHE_TTL = 60 * 5;

const heldKey = (addr: string) => `held-by:v3:${addr}`;

/** Drops Spin's cached held list, which carries collection colours, after a colour save. */
export function forgetSpinHeld() {
  return redisFailOpen("held-by evict", () => redis.del(heldKey(Addresses.SPIN)));
}

/**
 * Held copies counted per collection, for an owner too large to list token by
 * token (COSMO Spin holds millions). Copies are grouped before the join, so
 * only one row per collection meets the collection table; the lowest-serial
 * token is one indexed probe per collection, not a sort of every token.
 */
async function countHeld(addr: string) {
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
    .innerJoinLateral(first, sql`true`);

  return results;
}

export async function fetchHeldObjekts(
  address: string,
  artist: OwnedByFilters["artist"],
): Promise<HeldByOutput> {
  const addr = address.toLowerCase();

  // only Spin's pass is slow enough to cache; one entry whatever the artist scope
  const rows =
    addr === Addresses.SPIN
      ? await getCache(heldKey(addr), CACHE_TTL, () => countHeld(addr))
      : await countHeld(addr);
  const all = rows.map((row): HeldObjekt =>
    Object.assign(overrideCollection(row.collection), {
      copies: row.copies,
      minSerial: row.minSerial,
      minSerialTokenId: row.minSerialTokenId,
      firstReceivedAt: new Date(row.firstReceivedAt).toISOString(),
    }),
  );
  const artists = artist?.map((a) => a.toLowerCase());

  return {
    collections: artists?.length
      ? all.filter((collection) => artists.includes(collection.artist.toLowerCase()))
      : all,
  };
}

/** The tokens of `tokenIds` that `address` holds now, deduplicated, in the order given. */
export async function ownedTokenIds(address: string, tokenIds: number[]) {
  const wanted = [...new Set(tokenIds)];
  if (wanted.length === 0) return [];
  const rows = await chunkMap(wanted.map(String), TOKEN_CHUNK_SIZE, (batch) =>
    indexer
      .select({ id: objekts.id })
      .from(objekts)
      .where(and(inArray(objekts.id, batch), eq(objekts.owner, address.toLowerCase()))),
  );
  const held = new Set(rows.map((row) => row.id));
  return wanted.filter((tokenId) => held.has(String(tokenId)));
}
