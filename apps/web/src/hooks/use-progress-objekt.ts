import { useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";

import { collectionOptions } from "@/lib/query-options";
import { unobtainables } from "@/lib/unobtainables";

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

  // find missing objekts based on owned slug
  const ownedSlugs = new Set(ownedFiltered.map((obj) => obj.slug));
  const missingObjekts = objektsQuery.data.filter((obj) => !ownedSlugs.has(obj.slug));
  const missingFiltered = filter(missingObjekts);

  // combine both
  const filtered = [...ownedFiltered, ...missingFiltered];

  const stats = useMemo(() => {
    const allObjekts = filtered.filter(
      (obj) => !unobtainables.includes(obj.slug) && !["Welcome", "Zero"].includes(obj.class),
    );
    const owned = allObjekts.filter((obj) => ownedSlugs.has(obj.slug));
    const percentage =
      allObjekts.length > 0 ? Number(((owned.length / allObjekts.length) * 100).toFixed(1)) : 0;

    return {
      owned: owned.length,
      total: allObjekts.length,
      percentage,
    };
  }, [filtered, ownedSlugs]);

  return useDeferredValue({
    shaped: shape(filtered),
    filters,
    ownedSlugs,
    hasNextPage,
    stats,
  });
}
