import type { IndexedObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";

import { filterObjekts } from "@/lib/filter-utils";
import { orpc } from "@/lib/orpc/client";
import { collectionOptions } from "@/lib/query-options";
import type { OwnedBySchema } from "@/lib/universal/owned-by";

import { useCollectionRarity } from "./use-collection-rarity";
import { useCosmoArtist } from "./use-cosmo-artist";
import { type Filters, useFilters } from "./use-filters";

/**
 * Collections and sale listings live in separate databases and cannot be joined
 * server-side, so the already-cached collection list is merged with a
 * per-collection listing aggregate by slug.
 */
export function useMarketObjekts() {
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();
  const deferredFilters = useDeferredValue(filters);
  const rarityMap = useCollectionRarity();

  const serverFilters: OwnedBySchema = {
    artist: selectedArtistIds,
  };
  const collectionQuery = useQuery({ ...collectionOptions(serverFilters), throwOnError: true });
  const summaryQuery = useQuery(
    orpc.market.summary.queryOptions({
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      throwOnError: true,
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

  return useMemo(() => {
    const filtered: ValidObjekt[] = filterObjekts(deferredFilters, listed);
    const marketFilters: Filters = {
      ...deferredFilters,
      sort: deferredFilters.sort ?? "listedAt",
    };
    return {
      filtered,
      filters: marketFilters,
      rarityMap,
      totalListings: filtered.reduce((total, objekt) => total + (objekt.listingCount ?? 0), 0),
      isStale: filters !== deferredFilters,
      isPending: collectionQuery.isPending || summaryQuery.isPending,
    };
  }, [
    deferredFilters,
    listed,
    rarityMap,
    filters,
    collectionQuery.isPending,
    summaryQuery.isPending,
  ]);
}
