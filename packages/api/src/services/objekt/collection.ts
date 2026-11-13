import { toIndexedArtist } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import {
  dropStillMinting,
  estimateSerials,
  ESTIMATE_LOOKAHEAD,
  isGridDrop,
} from "@repo/lib/serial";
import { overrideCollection } from "@repo/lib/server/objekt";
import { fetchPublicNicknames } from "@repo/lib/server/user";
import { type SQL, and, asc, count, desc, eq, inArray, lte, ne, or, sql } from "drizzle-orm";

import { listModifiedMs, nextModifiedAt } from "../../lib/collection-bump";
import { type ListShape, type ShapedList, shapeRows } from "../../lib/collection-shape";
import { tokenIdWindow } from "../../lib/token-id-window";
import type {
  CollectionListInput,
  CollectionMetadataOutput,
  CollectionListOutput,
  SerialTransfersOutput,
  SerialsOutput,
} from "../../schemas/collections";
import { getCache, redis, redisFailOpen } from "../redis";
import { getCollectionColumns } from "./collection-columns";

const MODIFIED_AT_KEY = "collection:modified-at";

type CollectionListQuery = Pick<CollectionListInput, "artist" | "at"> & Partial<ListShape>;

type CollectionList =
  | { notModified: true; lastModifiedMs: number }
  | { notModified: false; lastModifiedMs: number; result: ShapedList };

// Nearly every request is the unfiltered list, so it is built once and reused
// until Last-Modified moves past it. The TTL picks up in-place edits that don't
// move it, such as indexer upserts.
const FULL_LIST_TTL_MS = 5 * 60 * 1000;
let fullListCache:
  | {
      lastModifiedMs: number;
      expiresAt: number;
      result: Promise<CollectionListOutput>;
      /** the list in the one slimmer shape last asked for, which is the web's */
      slim?: { key: string; list: Promise<ShapedList> };
    }
  | undefined;

function getFullList(
  whereQuery: SQL | undefined,
  lastModifiedMs: number,
  shape: ListShape,
): Promise<ShapedList> {
  if (
    !fullListCache ||
    fullListCache.lastModifiedMs < lastModifiedMs ||
    fullListCache.expiresAt <= Date.now()
  ) {
    const result = queryCollections(whereQuery);
    fullListCache = {
      lastModifiedMs,
      expiresAt: Date.now() + FULL_LIST_TTL_MS,
      result,
    };
    void result.catch(() => {
      if (fullListCache?.result === result) fullListCache = undefined;
    });
  }
  if (shape.originals && shape.ids) return fullListCache.result;
  const key = `${shape.originals}:${shape.ids}`;
  if (fullListCache.slim?.key !== key) {
    const list = fullListCache.result.then((full) =>
      shapeRows(
        full.collections.map((row) => ({ ...row })),
        shape,
      ),
    );
    fullListCache.slim = { key, list };
  }
  return fullListCache.slim.list;
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
 * Every collection in scope, newest first. Last-Modified is `listModifiedMs` (the latest bump, or
 * when the newest collection was minted or written) to the second, so a caller holding that copy
 * (`ifModifiedSinceMs`) is told it is current.
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

  const [stored, [latest]] = await Promise.all([
    redisFailOpen("collection modified-at", () => redis.get(MODIFIED_AT_KEY)),
    indexer
      .select({ id: collections.id, createdAt: collections.createdAt })
      .from(collections)
      .where(whereQuery)
      .orderBy(desc(collections.id))
      .limit(1),
  ]);

  if (!latest) return { notModified: false, lastModifiedMs: 0, result: { collections: [] } };

  const lastModifiedMs = Math.floor(listModifiedMs(stored, latest, Date.now()) / 1000) * 1000;

  if (ifModifiedSinceMs > 0 && ifModifiedSinceMs >= lastModifiedMs) {
    return { notModified: true, lastModifiedMs };
  }

  const shape = { originals: query.originals ?? true, ids: query.ids ?? true };
  const result =
    filters.length === 0
      ? await getFullList(whereQuery, lastModifiedMs, shape)
      : // a fresh query's rows are its own, so they are shaped without another copy
        await queryCollections(whereQuery).then((list) => shapeRows(list.collections, shape));

  return { notModified: false, lastModifiedMs, result };
}

/**
 * The newest collections in scope, in the list's order and the web's slim shape: the cards a
 * default grid draws first, which the home page sends with its HTML so they paint before the
 * whole list arrives. Three rows of the widest grid, as many as its loading grid holds.
 */
const LEAD_COLLECTIONS = 21;
const LEAD_TTL_MS = 60 * 1000;
// the home page waits on this, and it is only a head start: past this, the page goes without it
const LEAD_WAIT_MS = 150;
const leadCache = new Map<
  string,
  { expiresAt: number; version: string | null; rows: Promise<ShapedList> }
>();
const NO_LEAD: ShapedList = { collections: [] };

export async function fetchLeadCollections(artist: CollectionListInput["artist"]) {
  const timeout = new Promise<ShapedList>((resolve) => setTimeout(resolve, LEAD_WAIT_MS, NO_LEAD));
  return Promise.race([leadRows(artist).catch(() => NO_LEAD), timeout]);
}

async function leadRows(artist: CollectionListInput["artist"]) {
  const key = artist.toSorted().join(",");
  // the list's own freshness, so a new collection or a bump shows at once instead of after the TTL
  const version = await collectionListModifiedAt().catch(() => null);
  let entry = leadCache.get(key);
  if (!entry || entry.expiresAt <= Date.now() || entry.version !== version) {
    const rows = queryLeadCollections(artist);
    entry = { expiresAt: Date.now() + LEAD_TTL_MS, version, rows };
    leadCache.set(key, entry);
    void rows.catch(() => {
      if (leadCache.get(key)?.rows === rows) leadCache.delete(key);
    });
  }
  return entry.rows;
}

async function queryLeadCollections(artist: CollectionListInput["artist"]) {
  const rows = await indexer
    .select(getCollectionColumns())
    .from(collections)
    .where(artist.length ? inArray(collections.artist, artist.map(toIndexedArtist)) : undefined)
    .orderBy(desc(collections.id))
    .limit(LEAD_COLLECTIONS);
  return shapeRows(rows.map(overrideCollection), { originals: false, ids: false });
}

/**
 * Marks the collection list as changed now, so every browser's next load gets it again instead
 * of a 304. The one writer of `collection:modified-at` besides `process-collection-images`.
 * Call it after the change commits; `refreshed: false` means Redis did not take it.
 */
export async function bumpCollectionList() {
  // past the list's last change, a new row's write included, not only the stored bump: a browser
  // given a time in this second would otherwise get a 304
  const previous = await collectionListModifiedAt().catch(() =>
    redisFailOpen("collection modified-at", () => redis.get(MODIFIED_AT_KEY)),
  );
  const next = new Date(nextModifiedAt(Date.now(), previous)).toISOString();
  const written = await redisFailOpen("collection modified-at bump", () =>
    redis.set(MODIFIED_AT_KEY, next),
  );
  return { refreshed: written !== null, modifiedAt: written === null ? null : next };
}

/** When the full collection list last changed, as `fetchCollectionList` reads it, unfloored. */
export async function collectionListModifiedAt() {
  const [stored, [latest]] = await Promise.all([
    redisFailOpen("collection modified-at", () => redis.get(MODIFIED_AT_KEY)),
    indexer
      .select({ id: collections.id, createdAt: collections.createdAt })
      .from(collections)
      .orderBy(desc(collections.id))
      .limit(1),
  ]);
  const ms = listModifiedMs(stored, latest, Date.now());
  return ms > 0 ? new Date(ms).toISOString() : null;
}

// with the client's 60 s staleTime on top, figures stay within two minutes of the indexer
const DRAWER_TTL_SECONDS = 60;

export function fetchCollectionMetadata(slug: string): Promise<CollectionMetadataOutput> {
  return getCache(`collection-metadata:1:${slug}`, DRAWER_TTL_SECONDS, () =>
    readCollectionMetadata(slug),
  );
}

async function readCollectionMetadata(slug: string): Promise<CollectionMetadataOutput> {
  const [[result], [row]] = await Promise.all([
    indexer
      .select({
        total: count(),
        spin: sql`count(case when ${objekts.owner}=${Addresses.SPIN} then 1 end)`.mapWith(Number),
        transferable:
          sql`count(case when transferable = true and ${objekts.owner}!=${Addresses.SPIN} then 1 end)`.mapWith(
            Number,
          ),
        topSerial: sql`coalesce(max(${objekts.serial}), 0)`.mapWith(Number),
      })
      .from(collections)
      .innerJoin(objekts, eq(collections.id, objekts.collectionId))
      .where(eq(collections.slug, slug)),
    indexer
      .select({
        id: collections.id,
        season: collections.season,
        collectionNo: collections.collectionNo,
        artist: collections.artist,
        onOffline: collections.onOffline,
        batches: collections.serialBatches,
        originalFrontImage: collections.frontImage,
        originalBackImage: collections.backImage,
      })
      .from(collections)
      .where(eq(collections.slug, slug))
      .limit(1),
  ]);

  const { topSerial, ...counts } = result ?? { total: 0, spin: 0, transferable: 0, topSerial: 0 };
  if (!row) return { ...counts, serialEstimate: null };
  const { id, season, collectionNo, artist, onOffline, batches, ...images } = row;
  if (onOffline !== "offline" || !batches || batches.length === 0) {
    return { ...counts, serialEstimate: null, ...images };
  }
  const [open, ceiling] = await Promise.all([
    isGridDrop({ season, collectionNo, onOffline }) && dropOpen(season, collectionNo, artist),
    ceilingAbove(id, batches.at(-1)!.end),
  ]);
  const serialEstimate = estimateSerials({ season, batches, ceiling, topSerial, open });
  return { ...counts, serialEstimate, ...images };
}

// a drop's members share one creation window and one fit: any member without a
// fit mark keeps the whole drop open
async function dropOpen(
  season: string,
  collectionNo: string,
  artist: (typeof collections.$inferSelect)["artist"],
) {
  const [drop] = await indexer
    .select({
      firstCreatedAt: sql<string | null>`min(${collections.createdAt})`,
      fitted: sql<boolean | null>`bool_and(${collections.gridFittedAt} is not null)`,
    })
    .from(collections)
    .where(
      and(
        eq(collections.season, season),
        eq(collections.collectionNo, collectionNo),
        eq(collections.artist, artist),
        eq(collections.onOffline, "offline"),
      ),
    );
  if (!drop?.firstCreatedAt) return false;
  return dropStillMinting({
    fitted: drop.fitted === true,
    firstCreatedAt: drop.firstCreatedAt,
    now: Date.now(),
  });
}

// the first token minted above `end`, within the lookahead: another
// collection's closes the last range, the collection's own means its stored
// ranges are behind, so neither bounds it
async function ceilingAbove(collectionId: string, end: number) {
  const window = tokenIdWindow(end + 1, end + ESTIMATE_LOOKAHEAD);
  const [next] = await indexer
    .select({ id: objekts.id, collectionId: objekts.collectionId })
    .from(objekts)
    .where(
      or(
        ...window.map(
          (w) =>
            sql`(length(${objekts.id}) = ${w.length} and ${objekts.id} between ${w.lo} and ${w.hi})`,
        ),
      ),
    )
    .orderBy(asc(sql`length(${objekts.id})`), asc(objekts.id))
    .limit(1);
  return next && next.collectionId !== collectionId ? parseInt(next.id) : null;
}

export function fetchSerialList(slug: string): Promise<SerialsOutput> {
  return getCache(`collection-serials:1:${slug}`, DRAWER_TTL_SECONDS, () => readSerialList(slug));
}

async function readSerialList(slug: string): Promise<SerialsOutput> {
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
