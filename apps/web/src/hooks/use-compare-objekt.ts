import { useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { useDeferredValue } from "react";

import type { CompareInput } from "@/lib/compare/schemas";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";

import { useFilters } from "./use-filters";
import { useObjektFilter } from "./use-objekt-filter";
import { useShapeObjekts } from "./use-shape-objekt";

export function useCompareObjekts(input: CompareInput) {
  const filter = useObjektFilter();
  const shape = useShapeObjekts();
  const query = useSuspenseQuery(
    orpc.compare.compare.queryOptions({
      input,
      select: (data) => data.map(mapObjektWithTag),
      staleTime: 0,
    }),
  );
  const [filters] = useFilters();

  const filtered = filter(query.data);

  return useDeferredValue({
    shaped: shape(filtered),
    filtered,
    grouped: Object.values(groupBy(filtered, (a) => a.collectionId)),
    filters,
  });
}
