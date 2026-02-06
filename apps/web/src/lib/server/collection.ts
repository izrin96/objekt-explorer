import type { ValidOnlineType } from "@repo/cosmo/types/common";

import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { and, inArray, ne } from "drizzle-orm";

type CollectionFilters = {
  artist: string[];
  member: string[];
  season: string[];
  class: string[];
  on_offline: ValidOnlineType[];
  collection: string[];
};

/**
 * Materialize matching collection IDs for the given filters.
 * Returns `null` when no filters are active (caller should skip filtering),
 * or a UUID array (possibly empty — caller should short-circuit).
 */
export async function resolveCollectionIds(filters: CollectionFilters): Promise<string[] | null> {
  const hasFilters =
    filters.artist.length ||
    filters.member.length ||
    filters.season.length ||
    filters.class.length ||
    filters.on_offline.length ||
    filters.collection.length;

  if (!hasFilters) return null;

  const rows = await indexer
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        ne(collections.slug, "empty-collection"),
        ...(filters.artist.length
          ? [
              inArray(
                collections.artist,
                filters.artist.map((a) => a.toLowerCase()),
              ),
            ]
          : []),
        ...(filters.member.length ? [inArray(collections.member, filters.member)] : []),
        ...(filters.season.length ? [inArray(collections.season, filters.season)] : []),
        ...(filters.class.length ? [inArray(collections.class, filters.class)] : []),
        ...(filters.on_offline.length ? [inArray(collections.onOffline, filters.on_offline)] : []),
        ...(filters.collection.length
          ? [inArray(collections.collectionNo, filters.collection)]
          : []),
      ),
    );

  return rows.map((c) => c.id);
}
