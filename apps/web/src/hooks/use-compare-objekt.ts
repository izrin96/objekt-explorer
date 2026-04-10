import { useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { useDeferredValue, useMemo } from "react";

import type { CompareInput } from "@/lib/compare/schemas";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";

import { useCollectionRarity } from "./use-collection-rarity";
import { useFilters } from "./use-filters";
import { useObjektFilter } from "./use-objekt-filter";
import { useShapeObjekts } from "./use-shape-objekt";

export function useCompareObjekts(input: CompareInput) {
  const filter = useObjektFilter();
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
    const filtered = filter(deferredFilters, query.data);
    return {
      shaped: shape(filtered, deferredFilters, false, rarityMap),
      filtered,
      grouped: Object.values(groupBy(filtered, (a) => a.collectionId)),
      filters: deferredFilters,
      isStale: filters !== deferredFilters,
    };
  }, [filter, shape, deferredFilters, query.data, filters, rarityMap]);

  return result;
}
