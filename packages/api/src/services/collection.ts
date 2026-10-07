import { type ValidArtist, toIndexedArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { overrideCollection } from "@repo/lib/server/objekt";
import { fetchPublicNicknames, fetchUserProfiles } from "@repo/lib/server/user";
import { type SQL, and, asc, count, desc, eq, inArray, lte, ne, sql } from "drizzle-orm";

import type {
  CollectionMetadataOutput,
  CollectionListOutput,
  SerialTransfersOutput,
  SerialsOutput,
} from "../schemas/collections";
import { getSession } from "./auth";
import { getCollectionColumns } from "./objekt";
import { redis } from "./redis";

type CollectionListQuery = { artist: ValidArtist[]; at?: string };

type CollectionList =
  | { notModified: true; lastModifiedMs: number }
  | { notModified: false; lastModifiedMs: number; result: CollectionListOutput };

// Nearly every request is the unfiltered list, so it is built once and reused
// until Last-Modified moves past it. The TTL picks up in-place edits that don't
// move it, such as indexer upserts.
const FULL_LIST_TTL_MS = 5 * 60 * 1000;
let fullListCache:
  | { lastModifiedMs: number; expiresAt: number; result: Promise<CollectionListOutput> }
  | undefined;

function getFullList(whereQuery: SQL | undefined, lastModifiedMs: number) {
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
  return fullListCache.result;
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
  const whereQuery = and(...filters, ne(collections.slug, "empty-collection"));

  const [overrideStr, [latest]] = await Promise.all([
    redis.get("collection:modified-at"),
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

  const result =
    filters.length === 0
      ? await getFullList(whereQuery, lastModifiedMs)
      : await queryCollections(whereQuery);

  return { notModified: false, lastModifiedMs, result };
}

export async function fetchCollectionMetadata(slug: string): Promise<CollectionMetadataOutput> {
  const [result] = await indexer
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
    .where(eq(collections.slug, slug));

  return result ?? { total: 0, spin: 0, transferable: 0 };
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

/** One serial's transfer history, hidden when its owner keeps serials private from the caller. */
export async function fetchSerialTransfers(
  slug: string,
  serial: number,
): Promise<SerialTransfersOutput> {
  if (serial < 1) return { transfers: [] };

  const [session, results] = await Promise.all([
    getSession(),
    indexer
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
      .orderBy(desc(transfers.timestamp), desc(transfers.id)),
  ]);

  const [result] = results;
  if (!result) return { transfers: [] };

  const owner = await db.query.userAddress.findFirst({
    where: { address: result.owner },
    columns: {
      privateSerial: true,
    },
    orderBy: {
      id: "desc",
    },
  });

  const isPrivate = owner?.privateSerial ?? false;

  if (!session && isPrivate) return { hide: true, transfers: [] };

  if (session && isPrivate) {
    const profiles = await fetchUserProfiles(session.user.id);
    const ownerAddress = result.owner.toLowerCase();

    const isProfileAuthed = profiles.some((a) => a.address.toLowerCase() === ownerAddress);

    if (!isProfileAuthed) return { hide: true, transfers: [] };
  }

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
