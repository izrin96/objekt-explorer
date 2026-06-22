import { useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit/array";
import { useDeferredValue, useMemo } from "react";

import { filterObjekts } from "@/lib/filter-utils";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";
import type { CompareInput } from "@/lib/universal/compare";

import { useCollectionRarity } from "./use-collection-rarity";
import { useFilters } from "./use-filters";

export function useCompareObjekts(input: CompareInput) {
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
      filtered,
      grouped: Object.values(groupBy(filtered, (a) => a.collectionId)),
      filters: deferredFilters,
      rarityMap,
      isStale: filters !== deferredFilters,
    };
  }, [deferredFilters, query.data, filters, rarityMap]);

  return result;
}
