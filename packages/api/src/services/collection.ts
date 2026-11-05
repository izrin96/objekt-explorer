import { type ValidArtist, toIndexedArtist } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { overrideCollection } from "@repo/lib/server/objekt";
import { fetchPublicNicknames } from "@repo/lib/server/user";
import { type SQL, and, asc, count, desc, eq, inArray, lte, ne, sql } from "drizzle-orm";

import { nextModifiedAt } from "../lib/collection-bump";
import type {
  CollectionMetadataOutput,
  CollectionListOutput,
  SerialTransfersOutput,
  SerialsOutput,
} from "../schemas/collections";
import { getCollectionColumns } from "./objekt";
import { redis, redisFailOpen } from "./redis";

const MODIFIED_AT_KEY = "collection:modified-at";

type CollectionListQuery = { artist: ValidArtist[]; at?: string; originals?: boolean };

type CollectionList =
  | { notModified: true; lastModifiedMs: number }
  | { notModified: false; lastModifiedMs: number; result: CollectionListOutput };

// Nearly every request is the unfiltered list, so it is built once and reused
// until Last-Modified moves past it. The TTL picks up in-place edits that don't
// move it, such as indexer upserts.
const FULL_LIST_TTL_MS = 5 * 60 * 1000;
let fullListCache:
  | {
      lastModifiedMs: number;
      expiresAt: number;
      result: Promise<CollectionListOutput>;
      /** the same list without the Cosmo URLs, built on first request */
      slim?: Promise<CollectionListOutput>;
    }
  | undefined;

function withoutOriginals(list: CollectionListOutput): CollectionListOutput {
  return {
    collections: list.collections.map((collection) => {
      const slim = { ...collection };
      delete slim.originalFrontImage;
      delete slim.originalBackImage;
      return slim;
    }),
  };
}

function getFullList(whereQuery: SQL | undefined, lastModifiedMs: number, originals: boolean) {
  if (
    !fullListCache ||
    fullListCache.lastModifiedMs < lastModifiedMs ||
    fullListCache.expiresAt <= Date.now()
  ) {
    const result = queryCollections(whereQuery);
    fullListCache = { lastModifiedMs, expiresAt: Date.now() + FULL_LIST_TTL_MS, result };
    void result.catch(() => {
      if (fullListCache?.result === result) fullListCache = undefined;
    });
  }
  if (originals) return fullListCache.result;
  fullListCache.slim ??= fullListCache.result.then(withoutOriginals);
  return fullListCache.slim;
}

async function queryCollections(whereQuery: SQL | undefined): Promise<CollectionListOutput> {
  const result = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .where(whereQuery)
    .orderBy(desc(collections.id));

  return { collections: result.map(overrideCollection) };
}

/**
 * Every collection in scope, newest first. Last-Modified is the newest
 * collection or the latest override, whichever is later, to the second, so a
 * caller holding that copy (`ifModifiedSinceMs`) is told it is current.
 */
export async function fetchCollectionList(
  query: CollectionListQuery,
  ifModifiedSinceMs: number,
): Promise<CollectionList> {
  const filters = [
    ...(query.artist.length
      ? [inArray(collections.artist, query.artist.map(toIndexedArtist))]
      : []),
    ...(query.at ? [lte(collections.createdAt, query.at)] : []),
  ];
  const whereQuery = and(...filters);

  const [overrideStr, [latest]] = await Promise.all([
    redisFailOpen("collection modified-at", () => redis.get(MODIFIED_AT_KEY)),
    indexer
      .select({
        createdAt: collections.createdAt,
      })
      .from(collections)
      .where(whereQuery)
      .orderBy(desc(collections.id))
      .limit(1),
  ]);

  if (!latest) return { notModified: false, lastModifiedMs: 0, result: { collections: [] } };

  const overrideMs = overrideStr ? new Date(overrideStr).getTime() : 0;
  const createdAtMs = new Date(latest.createdAt).getTime();
  const lastModifiedMs = Math.floor(Math.max(createdAtMs, overrideMs) / 1000) * 1000;

  if (ifModifiedSinceMs > 0 && ifModifiedSinceMs >= lastModifiedMs) {
    return { notModified: true, lastModifiedMs };
  }

  const originals = query.originals ?? true;
  const result =
    filters.length === 0
      ? await getFullList(whereQuery, lastModifiedMs, originals)
      : await queryCollections(whereQuery).then((list) =>
          originals ? list : withoutOriginals(list),
        );

  return { notModified: false, lastModifiedMs, result };
}

/**
 * Marks the collection list as changed now, so every browser's next load gets it again instead
 * of a 304. The one writer of `collection:modified-at` besides `process-collection-images`.
 * Call it after the change commits; `refreshed: false` means Redis did not take it.
 */
export async function bumpCollectionList() {
  const written = await redisFailOpen("collection modified-at bump", async () => {
    const previous = await redis.get(MODIFIED_AT_KEY);
    const next = new Date(nextModifiedAt(Date.now(), previous)).toISOString();
    await redis.set(MODIFIED_AT_KEY, next);
    return next;
  });
  return { refreshed: written !== null, modifiedAt: written };
}

/** When the full collection list last changed: the later of the last bump and the newest collection. */
export async function collectionListModifiedAt() {
  const [stored, [latest]] = await Promise.all([
    redisFailOpen("collection modified-at", () => redis.get(MODIFIED_AT_KEY)),
    indexer
      .select({ createdAt: collections.createdAt })
      .from(collections)
      .orderBy(desc(collections.id))
      .limit(1),
  ]);
  const ms = Math.max(
    stored ? Date.parse(stored) || 0 : 0,
    latest ? new Date(latest.createdAt).getTime() : 0,
  );
  return ms > 0 ? new Date(ms).toISOString() : null;
}

export async function fetchCollectionMetadata(slug: string): Promise<CollectionMetadataOutput> {
  const [[result], [images]] = await Promise.all([
    indexer
      .select({
        total: count(),
        spin: sql`count(case when ${objekts.owner}=${Addresses.SPIN} then 1 end)`.mapWith(Number),
        transferable:
          sql`count(case when transferable = true and ${objekts.owner}!=${Addresses.SPIN} then 1 end)`.mapWith(
            Number,
          ),
      })
      .from(collections)
      .innerJoin(objekts, eq(collections.id, objekts.collectionId))
      .where(eq(collections.slug, slug)),
    indexer
      .select({
        originalFrontImage: collections.frontImage,
        originalBackImage: collections.backImage,
      })
      .from(collections)
      .where(eq(collections.slug, slug))
      .limit(1),
  ]);

  return { ...(result ?? { total: 0, spin: 0, transferable: 0 }), ...images };
}

export async function fetchSerialList(slug: string): Promise<SerialsOutput> {
  const results = await indexer
    .select({
      serial: objekts.serial,
      owner: objekts.owner,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(and(eq(collections.slug, slug), ne(objekts.serial, 0)))
    .orderBy(asc(objekts.serial));

  return {
    serials: results.map((a) => a.serial),
    spun: results.filter((a) => a.owner === Addresses.SPIN).map((a) => a.serial),
  };
}

/** One serial's transfer history. */
export async function fetchSerialTransfers(
  slug: string,
  serial: number,
): Promise<SerialTransfersOutput> {
  if (serial < 1) return { transfers: [] };

  const results = await indexer
    .select({
      tokenId: objekts.id,
      id: transfers.id,
      to: transfers.to,
      timestamp: transfers.timestamp,
      owner: objekts.owner,
      transferable: objekts.transferable,
    })
    .from(transfers)
    .innerJoin(objekts, eq(transfers.objektId, objekts.id))
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(and(eq(collections.slug, slug), eq(objekts.serial, serial)))
    .orderBy(desc(transfers.timestamp), desc(transfers.id));

  const [result] = results;
  if (!result) return { transfers: [] };

  const nicknameOf = await fetchPublicNicknames(Array.from(new Set(results.map((r) => r.to))));

  const isSpin = result.owner.toLowerCase() === Addresses.SPIN;

  return {
    tokenId: result.tokenId,
    owner: result.owner,
    transferable: isSpin ? false : result.transferable,
    transfers: results.map((result) => ({
      id: result.id,
      to: result.to,
      timestamp: new Date(result.timestamp).toISOString(),
      nickname: nicknameOf(result.to),
    })),
  };
}
