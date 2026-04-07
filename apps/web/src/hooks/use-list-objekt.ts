import { useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { useDeferredValue, useMemo } from "react";

import { mapObjektWithTag } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";

import { useFilters } from "./use-filters";
import { useObjektFilter } from "./use-objekt-filter";
import { useShapeObjekts } from "./use-shape-objekt";
import { useTarget } from "./use-target";

export function useListObjekts() {
  const list = useTarget((a) => a.list)!;
  const filter = useObjektFilter();
  const shape = useShapeObjekts();
  const query = useSuspenseQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: list.slug,
      },
      select: (data) => data.map(mapObjektWithTag),
      staleTime: 0,
    }),
  );
  const [filters] = useFilters();
  const deferredFilters = useDeferredValue(filters);

  const result = useMemo(() => {
    const filtered = filter(deferredFilters, query.data);
    return {
      shaped: shape(filtered, deferredFilters, false),
      filtered,
      grouped: Object.values(groupBy(filtered, (a) => a.collectionId)),
      filters: deferredFilters,
      isStale: filters !== deferredFilters,
    };
  }, [filter, shape, deferredFilters, query.data, filters]);

  return result;
}
