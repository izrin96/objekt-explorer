import { useCallback } from "react";

import type { ValidObjekt } from "@/lib/universal/objekts";

import { filterObjekts } from "@/lib/filter-utils";

import { useFilters } from "./use-filters";

export function useObjektFilter() {
  const [filters] = useFilters();
  return useCallback((objekts: ValidObjekt[]) => filterObjekts(filters, objekts), [filters]);
}
