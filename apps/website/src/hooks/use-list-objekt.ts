import { useQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit/array";
import { useDeferredValue, useMemo } from "react";

import { filterObjekts } from "@/lib/filter-utils";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";

import { useCollectionRarity } from "./use-collection-rarity";
import { isComparing, useCompareFilters } from "./use-compare-filters";
import { useFilters } from "./use-filters";
import { useListTarget } from "./use-list-target";

export function useListObjekts() {
  const list = useListTarget()!;
  const [compare] = useCompareFilters();
  const comparing = isComparing(compare);

  const listQuery = useQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: list.slug,
      },
      select: (data) => data.map(mapObjektWithTag),
      staleTime: 0,
      throwOnError: true,
      enabled: !comparing,
    }),
  );
  const compareQuery = useQuery(
    orpc.compare.compare.queryOptions({
      input: {
        sourceId: list.slug,
        targetType: compare.cmp_type ?? "profile",
        targetProfile: compare.cmp_type === "profile" ? (compare.cmp_to ?? "") : undefined,
        targetListId: compare.cmp_type === "list" ? (compare.cmp_to ?? "") : undefined,
        mode: compare.cmp_mode ?? "missing",
      },
      select: (data) => data.objekts.map(mapObjektWithTag),
      staleTime: 0,
      enabled: comparing,
      retry: false,
    }),
  );
  const query = comparing ? compareQuery : listQuery;

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
      isError: comparing && query.isError,
      error: query.error,
    };
  }, [
    deferredFilters,
    query.data,
    query.isPending,
    query.isError,
    query.error,
    filters,
    rarityMap,
    comparing,
  ]);

  return result;
}
