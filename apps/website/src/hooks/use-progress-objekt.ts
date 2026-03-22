import { useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { useDeferredValue, useMemo } from "react";

import { collectionOptions } from "@/lib/query-options";
import { tradeableFilter } from "@/lib/utils";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useObjektFilter } from "./use-objekt-filter";
import { useOwnedCollections } from "./use-owned-collections";
import { useShapeProgress } from "./use-shape-progress";
import { useTarget } from "./use-target";

export function useProgressObjekts() {
  const filter = useObjektFilter();
  const shape = useShapeProgress();
  const profile = useTarget((a) => a.profile)!;
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();

  const { objekts: allOwnedObjekts, hasNextPage } = useOwnedCollections(
    profile.address,
    selectedArtistIds,
    filters.at ?? undefined,
  );
  const objektsQuery = useSuspenseQuery(
    collectionOptions(selectedArtistIds, !hasNextPage, filters.at ?? undefined),
  );

  // owned objekts
  const ownedFiltered = filter(allOwnedObjekts);

  // all collections filtered
  const collectionsFiltered = filter(objektsQuery.data);

  // find missing objekts based on owned slug
  const ownedSlugs = new Set(ownedFiltered.map((obj) => obj.slug));
  const missingObjekts = collectionsFiltered.filter((obj) => !ownedSlugs.has(obj.slug));

  // combine both
  const filtered = [...ownedFiltered, ...missingObjekts];

  const stats = useMemo(() => {
    const ownedGrouped = Object.values(groupBy(ownedFiltered, (obj) => obj.collectionId));
    const owned = ownedGrouped.filter(([objekt]) => objekt && tradeableFilter(objekt)).length;

    const total = collectionsFiltered.filter(tradeableFilter).length;

    const percentage = total > 0 ? Number(((owned / total) * 100).toFixed(1)) : 0;

    return {
      owned,
      total,
      percentage,
    };
  }, [ownedFiltered, collectionsFiltered]);

  return useDeferredValue({
    shaped: shape(filtered),
    filters,
    ownedSlugs,
    hasNextPage,
    stats,
    ownedFiltered,
    collectionsFiltered,
  });
}
