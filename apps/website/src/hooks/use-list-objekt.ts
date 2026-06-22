import { useQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit/array";
import { useDeferredValue, useMemo } from "react";

import { filterObjekts } from "@/lib/filter-utils";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";

import { useCollectionRarity } from "./use-collection-rarity";
import { useFilters } from "./use-filters";
import { useListTarget } from "./use-list-target";

export function useListObjekts() {
  const list = useListTarget()!;
  const query = useQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: list.slug,
      },
      select: (data) => data.map(mapObjektWithTag),
      staleTime: 0,
      throwOnError: true,
    }),
  );
  const [filters] = useFilters();
  const deferredFilters = useDeferredValue(filters);
  const rarityMap = useCollectionRarity();

  const result = useMemo(() => {
    const filtered = filterObjekts(deferredFilters, query.data ?? []);
    return {
      filtered,
      grouped: Object.values(groupBy(filtered, (a) => a.collectionId)),
      filters: deferredFilters,
      rarityMap,
      isStale: filters !== deferredFilters,
      isPending: query.isPending,
    };
  }, [deferredFilters, query.data, query.isPending, filters, rarityMap]);

  return result;
}
