import { toIndexedArtist, type ValidArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import type { ListEntry } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { loadCollectionOverrides } from "@repo/lib/server/collection-override";
import { mapOwnedObjekt, overrideCollection } from "@repo/lib/server/objekt";
import type { ListEntryFields, ListObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray } from "drizzle-orm";

import { getCollectionColumns, getPartialCollectionColumns } from "../objekt";
import { TOKEN_CHUNK_SIZE } from "../utils";
import { fetchCollectionsBySlug } from "./collections";

interface ListEntryTransformConfig {
  artists?: ValidArtist[];
  hideSerial?: boolean;
}

type EntryPick = Pick<
  ListEntry,
  "collectionSlug" | "objektId" | "id" | "price" | "isQyop" | "note" | "ratio"
>;

/** `id` stays unique when a list holds the same collection twice */
function entryFields(entry: EntryPick): ListEntryFields & { id: string } {
  return {
    id: entry.id.toString(),
    entryId: entry.id,
    price: entry.price,
    isQyop: entry.isQyop,
    note: entry.note,
    ratio: entry.ratio,
  };
}

async function buildProfileListEntries(
  entries: EntryPick[],
  config?: ListEntryTransformConfig,
): Promise<ListObjekt[]> {
  const objektIds = entries.map((e) => e.objektId).filter((a) => a !== null);

  if (objektIds.length === 0) return [];

  const [objektsData, overrides] = await Promise.all([
    chunkMap(objektIds, TOKEN_CHUNK_SIZE, (batch) =>
      indexer
        .select({
          objekt: objekts,
          collection: getCollectionColumns(),
        })
        .from(objekts)
        .innerJoin(collections, eq(collections.id, objekts.collectionId))
        .where(
          and(
            inArray(objekts.id, batch),
            ...(config?.artists?.length
              ? [inArray(collections.artist, config.artists.map(toIndexedArtist))]
              : []),
          ),
        ),
    ),
    loadCollectionOverrides(),
  ]);

  const objektMap = new Map(objektsData.map((o) => [o.objekt.id, o]));

  return entries
    .filter((e) => e.objektId !== null)
    .map((entry) => {
      const data = objektMap.get(entry.objektId!);
      if (!data) return null;
      const objekt = config?.hideSerial
        ? overrideCollection(data.collection, overrides.map)
        : mapOwnedObjekt(data.objekt, data.collection, overrides.map);
      return Object.assign({}, objekt, entryFields(entry));
    })
    .filter((a) => a !== null);
}

async function buildNormalListEntries(
  entries: EntryPick[],
  config?: ListEntryTransformConfig,
): Promise<ListObjekt[]> {
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
      return Object.assign({}, collection, entryFields(entry));
    });
}

export async function buildListEntries(
  entries: EntryPick[],
  isProfileBind: boolean,
  config?: ListEntryTransformConfig,
): Promise<ListObjekt[]> {
  if (isProfileBind) {
    return buildProfileListEntries(entries, config);
  }
  return buildNormalListEntries(entries, config);
}

/**
 * Return only partial collection of list entry
 * Only used by Generate Discord Format for now
 */
export async function fetchPartialOwnedListCollections(slug: string, userId: string) {
  const list = await db.query.lists.findFirst({
    where: { slug, ...(userId ? { userId } : {}) },
    with: {
      entries: {
        columns: {
          collectionSlug: true,
          objektId: true,
        },
        where: { ruleId: { isNull: true } },
      },
    },
  });

  if (!list) return [];

  if (list.isProfileBind) {
    const objektIds = list.entries.map((e) => e.objektId).filter((a) => a !== null);

    if (objektIds.length === 0) return [];

    const objektsData = await chunkMap(objektIds, TOKEN_CHUNK_SIZE, (batch) =>
      indexer
        .select({
          id: objekts.id,
          collection: {
            ...getPartialCollectionColumns(),
          },
        })
        .from(objekts)
        .innerJoin(collections, eq(collections.id, objekts.collectionId))
        .where(inArray(objekts.id, batch)),
    );

    const objektToCollection = new Map(objektsData.map((o) => [o.id, o.collection]));

    return list.entries
      .filter((e) => e.objektId !== null)
      .map((e) => {
        const collection = objektToCollection.get(e.objektId!);
        return collection ?? null;
      })
      .filter((a) => a !== null);
  }

  const slugs = [...new Set(list.entries.map((e) => e.collectionSlug).filter((a) => a !== null))];

  if (slugs.length === 0) return [];

  const foundCollections = await chunkMap(slugs, TOKEN_CHUNK_SIZE, (batch) =>
    indexer
      .select({
        ...getPartialCollectionColumns(),
      })
      .from(collections)
      .where(inArray(collections.slug, batch)),
  );

  const slugToCollection = new Map(foundCollections.map((c) => [c.slug, c]));

  return list.entries
    .filter((e) => e.collectionSlug !== null)
    .map((e) => {
      const collection = slugToCollection.get(e.collectionSlug!);
      return collection ?? null;
    })
    .filter((a) => a !== null);
}
