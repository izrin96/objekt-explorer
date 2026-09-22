import type { IndexedObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { filterObjekts } from "@/features/filters/filter-utils";
import type { FilterSearch } from "@/features/filters/search-schema";
import { useCanonicalFilters } from "@/features/filters/use-filters";
import { collectionOptions } from "@/features/objekt/queries";
import { useCollectionRarity } from "@/features/objekt/use-collection-rarity";
import { orpc } from "@/lib/orpc";

/** matches the server's summary cache */
const SUMMARY_STALE_TIME = 1000 * 60;

/** the grid opens on what was listed most recently */
const DEFAULT_MARKET_SORT = "listedAt";

/**
 * Collections and sale listings live in separate databases and cannot be
 * joined server-side, so the cached catalogue is merged with the per-collection
 * listing aggregate by slug. Filtering runs over every row, so it follows a
 * deferred copy of the filters.
 */
export function useMarketObjekts() {
  const { selectedArtistIds } = useCosmoArtist();
  const filters = useCanonicalFilters();
  const deferredFilters = useDeferredValue(filters);

  const { rarityMap, isLoading: rarityLoading } = useCollectionRarity();
  const collectionQuery = useQuery(collectionOptions({ artist: selectedArtistIds }));
  const summaryQuery = useQuery(
    orpc.market.summary.queryOptions({
      staleTime: SUMMARY_STALE_TIME,
      refetchOnWindowFocus: false,
    }),
  );

  const listed = useMemo(() => {
    const collections = collectionQuery.data;
    const summary = summaryQuery.data;
    if (!collections || !summary) return [];

    const bySlug = new Map(summary.map((entry) => [entry.slug, entry]));
    const objekts: IndexedObjekt[] = [];

    for (const collection of collections) {
      const entry = bySlug.get(collection.slug);
      if (!entry) continue;
      objekts.push({
        ...collection,
        floorPrice: entry.minPrice,
        hasQyop: entry.hasQyop,
        listingCount: entry.count,
        listedAt: entry.listedAt,
      });
    }

    return objekts;
  }, [collectionQuery.data, summaryQuery.data]);

  const filtered: ValidObjekt[] = useMemo(
    () => filterObjekts(deferredFilters, listed),
    [deferredFilters, listed],
  );

  const marketFilters: FilterSearch = useMemo(
    () => ({ ...deferredFilters, sort: deferredFilters.sort ?? DEFAULT_MARKET_SORT }),
    [deferredFilters],
  );

  return {
    filtered,
    filters: marketFilters,
    rarityMap,
    totalListings: filtered.reduce((total, objekt) => total + (objekt.listingCount ?? 0), 0),
    isStale: filters !== deferredFilters,
    isPending: collectionQuery.isPending || summaryQuery.isPending || rarityLoading,
  };
}
