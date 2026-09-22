import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

import { mapObjektWithTag } from "@/features/objekt/objekt-utils";
import { orpc } from "@/lib/orpc";

import { type ActiveCompare, type CompareSearch, compareSearchSchema } from "./search-schema";

const CLEARED: CompareSearch = { cmp_type: undefined, cmp_to: undefined, cmp_mode: undefined };

export function useCompareSearch(): CompareSearch {
  return useSearch({
    strict: false,
    select: (search) => compareSearchSchema.parse(search),
  });
}

/** `null` drops all three at once, which is what the banner's Cancel does. */
export function useSetCompare(): (next: ActiveCompare | null) => void {
  const navigate = useNavigate();

  return useCallback(
    (next: ActiveCompare | null) => {
      void navigate({
        replace: next === null,
        // the detail routes declare the schema; `navigate` with no `to` types
        // the search against every route at once and lands on `never`
        search: ((prev: CompareSearch) => ({ ...prev, ...CLEARED, ...next })) as never,
      });
    },
    [navigate],
  );
}

export function useCompareQuery(sourceId: string, compare: ActiveCompare | null) {
  return useQuery(
    orpc.compare.compare.queryOptions({
      input: {
        sourceId,
        targetType: compare?.cmp_type ?? "profile",
        targetProfile: compare?.cmp_type === "profile" ? compare.cmp_to : undefined,
        targetListId: compare?.cmp_type === "list" ? compare.cmp_to : undefined,
        mode: compare?.cmp_mode ?? "missing",
      },
      // search and the edition facet read fields the endpoint does not carry
      select: (data) => ({ objekts: data.objekts.map(mapObjektWithTag) }),
      staleTime: 0,
      enabled: compare !== null,
      retry: false,
    }),
  );
}
