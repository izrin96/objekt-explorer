import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

import { modeSchema, targetTypeSchema } from "@/lib/universal/compare";

export function useCompareFilters() {
  return useQueryStates({
    cmp_type: parseAsStringEnum<"profile" | "list">([...targetTypeSchema.options]),
    cmp_to: parseAsString,
    cmp_mode: parseAsStringEnum<"missing" | "matches">([...modeSchema.options]),
  });
}

export type CompareFilters = ReturnType<typeof useCompareFilters>[0];

export function isComparing(f: CompareFilters) {
  return f.cmp_type !== null && f.cmp_to !== null && f.cmp_mode !== null;
}
