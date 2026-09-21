import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { filterObjekts } from "@/features/filters/filter-utils";
import { useCanonicalFilters } from "@/features/filters/use-filters";

import { collectionOptions } from "./queries";

/** Filtering runs over every row, so it follows a deferred copy of the filters. */
export function useCollectionObjekts() {
  const { selectedArtistIds } = useCosmoArtist();
  const filters = useCanonicalFilters();
  const deferredFilters = useDeferredValue(filters);
  const query = useQuery(collectionOptions({ artist: selectedArtistIds }));

  const filtered = useMemo(
    () => filterObjekts(deferredFilters, query.data ?? []),
    [deferredFilters, query.data],
  );

  return {
    filtered,
    filters: deferredFilters,
    isStale: filters !== deferredFilters,
    isPending: query.isPending,
  };
}
