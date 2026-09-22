import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";

import { defaultFilters, type FilterSearch } from "./search-schema";

export type FilterPatch = Partial<FilterSearch>;

/** `at` survives a reset: it scopes the surface, it is not one of its filters. */
const { at: _at, ...resetPatch } = defaultFilters;

/** Pass a selector wherever one value is enough, or the control re-renders on every filter. */
export function useFilters(): FilterSearch;
export function useFilters<T>(select: (filters: FilterSearch) => T): T;
export function useFilters<T>(select?: (filters: FilterSearch) => T): FilterSearch | T {
  return useSearch({
    strict: false,
    select: (search) => {
      const filters = search as FilterSearch;
      return select ? select(filters) : filters;
    },
  }) as FilterSearch | T;
}

/**
 * A link may spell a member any way ("Yooyeon"), but every control compares
 * against Cosmo's own spelling, so the value is folded onto it on the way in.
 */
export function useCanonicalFilters(): FilterSearch {
  const filters = useFilters();
  const { getMember } = useCosmoArtist();

  return useMemo(() => {
    if (filters.member === undefined) return filters;
    return { ...filters, member: filters.member.map((name) => getMember(name)?.name ?? name) };
  }, [filters, getMember]);
}

/** Drops keys the URL should not carry, so removing a filter removes its parameter. */
function withoutEmpty(search: FilterSearch): FilterSearch {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (value === "") continue;
    result[key] = value;
  }
  return result as FilterSearch;
}

export function useSetFilters(): (patch: FilterPatch) => void {
  const navigate = useNavigate();

  return useCallback(
    (patch: FilterPatch) => {
      void navigate({
        // `replace`: a filter is a view of one page, not a place to go back to
        replace: true,
        // the grid the user is looking at should not jump to the top on every filter
        resetScroll: false,
        // every filtering route declares `filterSearchSchema`, but `navigate`
        // with no `to` types the search against all routes at once and lands on
        // `never`; the schema re-validates whatever is written here
        search: ((prev: FilterSearch) => withoutEmpty({ ...prev, ...patch })) as never,
      });
    },
    [navigate],
  );
}

export function useResetFilters(): () => void {
  const setFilters = useSetFilters();
  return useCallback(() => setFilters(resetPatch), [setFilters]);
}
