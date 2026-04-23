import { useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { useDeferredValue, useMemo } from "react";

import { filterObjekts } from "@/lib/filter-utils";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";

import { useCollectionRarity } from "./use-collection-rarity";
import { useFilters } from "./use-filters";
import { useShapeObjekts } from "./use-shape-objekt";
import { useTarget } from "./use-target";

export function useListObjekts() {
  const list = useTarget((a) => a.list)!;
  const shape = useShapeObjekts();
  const query = useSuspenseQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: list.slug,
      },
      select: (data) => data.map(mapObjektWithTag),
      staleTime: 1000 * 60 * 5,
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
