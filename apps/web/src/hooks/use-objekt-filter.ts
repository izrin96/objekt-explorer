import type { ValidObjekt } from "@repo/lib/objekts";

import { useCallback } from "react";

import { filterObjekts } from "@/lib/filter-utils";

import { useFilters } from "./use-filters";

export function useObjektFilter() {
  const [filters] = useFilters();
  return useCallback((objekts: ValidObjekt[]) => filterObjekts(filters, objekts), [filters]);
}
