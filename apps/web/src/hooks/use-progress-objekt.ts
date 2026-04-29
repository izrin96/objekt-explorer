import { useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit/array";
import { useDeferredValue, useMemo } from "react";

import { filterObjekts } from "@/lib/filter-utils";
import { collectionOptions } from "@/lib/query-options";
import { tradeableFilter } from "@/lib/utils";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useOwnedCollections } from "./use-owned-collections";
import { useShapeProgress } from "./use-shape-progress";
import { useTarget } from "./use-target";

export function useProgressObjekts() {
  const shape = useShapeProgress();
  const profile = useTarget((a) => a.profile)!;
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();
  const deferredFilters = useDeferredValue(filters);

  const serverFilters = {
    artist: selectedArtistIds,
    at: filters.at ?? undefined,
  };

  const { objekts: allOwnedObjekts, hasNextPage } = useOwnedCollections(
    profile.address,
    serverFilters,
  );
  const objektsQuery = useSuspenseQuery(collectionOptions(serverFilters, !hasNextPage));

  const result = useMemo(() => {
    // owned objekts
    const ownedFiltered = filterObjekts(deferredFilters, allOwnedObjekts);

    // all collections filtered
    const collectionsFiltered = filterObjekts(deferredFilters, objektsQuery.data);

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
      hasNextPage,
      stats,
      ownedFiltered,
      collectionsFiltered,
      isStale: filters !== deferredFilters,
    };
  }, [shape, deferredFilters, allOwnedObjekts, objektsQuery.data, hasNextPage, filters]);

  return result;
}
