import { useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";

import { collectionOptions } from "@/lib/query-options";

import { useCollectionRarity } from "./use-collection-rarity";
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
  const rarityMap = useCollectionRarity();

  const serverFilters = {
    artist: selectedArtistIds,
  };
  const query = useSuspenseQuery(collectionOptions(serverFilters));

  const result = useMemo(() => {
    const filtered = filter(deferredFilters, query.data);
    return {
      shaped: shape(filtered, deferredFilters, false, rarityMap),
      filtered,
      filters: deferredFilters,
      isStale: filters !== deferredFilters,
    };
  }, [filter, shape, deferredFilters, query.data, filters, rarityMap]);

  return result;
}
