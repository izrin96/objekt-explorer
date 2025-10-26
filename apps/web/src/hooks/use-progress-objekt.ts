import { useSuspenseQueries } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useObjektFilter } from "./use-objekt-filter";
import { useShapeProgress } from "./use-shape-progress";
import { useTarget } from "./use-target";

export function useProgressObjekts() {
  const filter = useObjektFilter();
  const shape = useShapeProgress();
  const profile = useTarget((a) => a.profile)!;
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();

  const [objektsQuery, ownedQuery] = useSuspenseQueries({
    queries: [
      collectionOptions(selectedArtistIds),
      ownedCollectionOptions(profile.address, selectedArtistIds),
    ],
  });

  // owned objekts
  const ownedFiltered = filter(ownedQuery.data);

  // find missing objekts based on owned slug
  const ownedSlugs = new Set(ownedFiltered.map((obj) => obj.slug));
  const missingObjekts = objektsQuery.data.filter((obj) => !ownedSlugs.has(obj.slug));
  const missingFiltered = filter(missingObjekts);

  // combine both
  const filtered = [...ownedFiltered, ...missingFiltered];

  return useDeferredValue({
    shaped: shape(filtered),
    filters,
    ownedSlugs,
  });
}
