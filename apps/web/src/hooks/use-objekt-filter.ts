import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useCallback } from "react";

import { filterObjekts } from "@/lib/filter-utils";

import type { Filters } from "./use-filters";

export function useObjektFilter() {
  return useCallback(
    (filters: Filters, objekts: ValidObjekt[]) => filterObjekts(filters, objekts),
    [],
  );
}
