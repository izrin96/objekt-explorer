import type { ValidArtist } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import type { ListEntry } from "@repo/db/schema";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray } from "drizzle-orm";

import { getCollectionColumns } from "./objekt";

export interface ListEntryTransformConfig {
  artists?: ValidArtist[];
}

/**
 * Fetches collections from indexer by slug array with optional artist filtering
 */
export async function fetchCollectionsBySlug(slugs: string[], artists: ValidArtist[]) {
  const uniqueSlugs = new Set(slugs);

  if (uniqueSlugs.size === 0) return [];

  const result = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .where(
      and(
        inArray(collections.slug, Array.from(uniqueSlugs)),
        ...(artists.length
          ? [
              inArray(
                collections.artist,
                artists.map((a) => a.toLowerCase()),
              ),
            ]
          : []),
      ),
    );

  return result.map(overrideCollection);
}

/**
 * Build profile list entries (using objektId)
 */
async function buildProfileListEntries(
  entries: Pick<ListEntry, "collectionSlug" | "objektId" | "id" | "price" | "isQyop" | "note">[],
  config?: ListEntryTransformConfig,
): Promise<ValidObjekt[]> {
  const objektIds = entries.map((e) => e.objektId).filter((a) => a !== null);

  if (objektIds.length === 0) return [];

  const objektsData = await indexer
    .select({
      objekt: objekts,
      collection: getCollectionColumns(),
    })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        inArray(objekts.id, objektIds),
        ...(config?.artists?.length
          ? [
              inArray(
                collections.artist,
                config.artists.map((a) => a.toLowerCase()),
              ),
            ]
          : []),
      ),
    );

  const objektMap = new Map(objektsData.map((o) => [o.objekt.id, o]));

  return entries
    .filter((e) => e.objektId !== null)
    .map((entry) => {
      const data = objektMap.get(entry.objektId!);
      if (!data || !data.collection) return null;
      const ownedObjekt = mapOwnedObjekt(data.objekt, data.collection);
      return Object.assign({}, ownedObjekt, {
        id: entry.id.toString(),
        order: entry.id,
        price: entry.price ?? undefined,
        isQyop: entry.isQyop ?? undefined,
        note: entry.note ?? undefined,
      });
    })
    .filter((a) => a !== null);
}

type EntryPick = Pick<
  ListEntry,
  "collectionSlug" | "objektId" | "id" | "price" | "isQyop" | "note"
>;

/**
 * Build normal list entries (using collectionSlug)
 */
async function buildNormalListEntries(
  entries: EntryPick[],
  config?: ListEntryTransformConfig,
): Promise<ValidObjekt[]> {
  const validEntries = entries
    .toSorted((a, b) => a.id - b.id)
    .filter((a) => a.collectionSlug !== null);

  const slugs = validEntries.map((a) => a.collectionSlug!);
  const collectionsData = await fetchCollectionsBySlug(slugs, config?.artists ?? []);
  const collectionsMap = new Map(collectionsData.map((c) => [c.slug, c]));

  return validEntries
    .filter((a) => collectionsMap.has(a.collectionSlug!))
    .map((entry) => {
      const collectionSlug = entry.collectionSlug!;
      const collection = collectionsMap.get(collectionSlug)!;
      return Object.assign({}, collection, {
        id: entry.id.toString(),
        order: entry.id,
        price: entry.price ?? undefined,
        isQyop: entry.isQyop ?? undefined,
        note: entry.note ?? undefined,
      });
    });
}

/**
 * Main entry point for building list entries
 * Handles both profile and normal list types
 */
export async function buildListEntries(
  entries: Pick<ListEntry, "collectionSlug" | "objektId" | "id" | "price" | "isQyop" | "note">[],
  listType: "normal" | "profile",
  config?: ListEntryTransformConfig,
): Promise<ValidObjekt[]> {
  if (listType === "profile") {
    return buildProfileListEntries(entries, config);
  }
  return buildNormalListEntries(entries, config);
}
