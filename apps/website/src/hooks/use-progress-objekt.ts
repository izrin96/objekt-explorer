import { useQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit/array";
import { useDeferredValue, useMemo } from "react";

import { filterObjekts } from "@/lib/filter-utils";
import { collectionOptions } from "@/lib/query-options";
import type { OwnedBySchema } from "@/lib/universal/owned-by";
import { tradeableFilter } from "@/lib/utils";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useOwnedCollections } from "./use-owned-collections";
import { useProfileTarget } from "./use-profile-target";
import { useShapeProgress } from "./use-shape-progress";

export function useProgressObjekts() {
  const shape = useShapeProgress();
  const profile = useProfileTarget()!;
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();
  const deferredFilters = useDeferredValue(filters);

  const serverFilters: OwnedBySchema = {
    artist: selectedArtistIds,
    at: filters.at ?? undefined,
  };

  const { objekts, query } = useOwnedCollections(profile.address, serverFilters);
  const collectionQuery = useQuery(collectionOptions(serverFilters, !query.hasNextPage));

  const result = useMemo(() => {
    // owned objekts
    const ownedFiltered = filterObjekts(deferredFilters, objekts);

    // all collections filtered
    const collectionsFiltered = filterObjekts(deferredFilters, collectionQuery.data ?? []);

    // find missing objekts based on owned slug
    const ownedSlugs = new Set(ownedFiltered.map((obj) => obj.slug));
    const missingObjekts = collectionsFiltered.filter((obj) => !ownedSlugs.has(obj.slug));

    // combine both
    const filtered = [...ownedFiltered, ...missingObjekts];

    const ownedGrouped = Object.values(groupBy(ownedFiltered, (obj) => obj.collectionId));
    const owned = ownedGrouped.filter(([objekt]) => objekt && tradeableFilter(objekt)).length;

    const total = collectionsFiltered.filter(tradeableFilter).length;

    const percentage = total > 0 ? Number(((owned / total) * 100).toFixed(1)) : 0;

    const stats = {
      owned,
      total,
      percentage,
    };

    return {
      shaped: shape(filtered),
      filters: deferredFilters,
      ownedSlugs,
      hasNextPage: query.hasNextPage,
      isPending: query.isPending || collectionQuery.isPending,
      stats,
      ownedFiltered,
      collectionsFiltered,
      isStale: filters !== deferredFilters,
    };
  }, [
    shape,
    deferredFilters,
    objekts,
    collectionQuery.data,
    query.hasNextPage,
    query.isPending,
    collectionQuery.isPending,
    filters,
  ]);

  return result;
}
