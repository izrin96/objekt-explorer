import { useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit/array";
import { useDeferredValue, useMemo } from "react";

import { filterObjekts } from "@/lib/filter-utils";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";
import type { CompareInput } from "@/lib/universal/compare";

import { useCollectionRarity } from "./use-collection-rarity";
import { useFilters } from "./use-filters";
import { useShapeObjekts } from "./use-shape-objekt";

export function useCompareObjekts(input: CompareInput) {
  const shape = useShapeObjekts();
  const query = useSuspenseQuery(
    orpc.compare.compare.queryOptions({
      input,
      select: (data) => data.objekts.map(mapObjektWithTag),
      staleTime: 0,
    }),
  );
  const [filters] = useFilters();
  const deferredFilters = useDeferredValue(filters);
  const rarityMap = useCollectionRarity();

  const result = useMemo(() => {
    const filtered = filterObjekts(deferredFilters, query.data);
    return {
      shaped: shape(filtered, deferredFilters, false, rarityMap),
      filtered,
      grouped: Object.values(groupBy(filtered, (a) => a.collectionId)),
      filters: deferredFilters,
      isStale: filters !== deferredFilters,
    };
  }, [shape, deferredFilters, query.data, filters, rarityMap]);

  return result;
}
