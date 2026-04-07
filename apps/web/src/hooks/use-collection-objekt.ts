import { useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";

import { collectionOptions } from "@/lib/query-options";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useObjektFilter } from "./use-objekt-filter";
import { useShapeObjekts } from "./use-shape-objekt";

export function useCollectionObjekts() {
  const filter = useObjektFilter();
  const shape = useShapeObjekts();
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();
  const deferredFilters = useDeferredValue(filters);

  const serverFilters = {
    artist: selectedArtistIds,
  };
  const query = useSuspenseQuery(collectionOptions(serverFilters));

  const result = useMemo(() => {
    const filtered = filter(deferredFilters, query.data);
    return {
      shaped: shape(filtered, deferredFilters, false),
      filtered,
      filters: deferredFilters,
      isStale: filters !== deferredFilters,
    };
  }, [filter, shape, deferredFilters, query.data, filters]);

  return result;
}
