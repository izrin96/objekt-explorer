import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/use-cosmo-artist";
import { noteFilterReset } from "@/stores/filter-resets";

import type { FacetPatch } from "./facet-keys";
import {
  defaultFilters,
  filterSearchSchema,
  type FilterSearch,
  pickFilters,
} from "./search-schema";

export type FilterPatch = Partial<FilterSearch>;

/** `at` survives a reset: it scopes the surface, it is not one of its filters. */
const { at: _at, ...resetPatch } = defaultFilters;

/** Pass a selector wherever one value is enough, or the control re-renders on every filter. */
export function useFilters(): FilterSearch;
export function useFilters<T>(select: (filters: FilterSearch) => T): T;
export function useFilters<T>(select?: (filters: FilterSearch) => T): FilterSearch | T {
  return useSearch({
    strict: false,
    // the drawer's params share the URL; this keeps the filters the same
    // object when only those change, so the grid does not refilter
    structuralSharing: true,
    // the cast only because a generic `T` cannot prove it is plain data
    select: (search) => {
      const filters = pickFilters(search);
      return (select ? select(filters) : filters) as FilterSearch;
    },
  }) as FilterSearch | T;
}

/**
 * A link may spell a member any way ("Yooyeon"), but every control compares
 * against Cosmo's own spelling, so the value is folded onto it on the way in.
 */
export function useCanonicalFilters(): FilterSearch {
  return useCanonical(useFilters());
}

/**
 * The same, for a component above the routes that declare `filterSearchSchema`,
 * such as a layout: there the search is still the raw URL (`?member=a` is the
 * string `"a"`), so it is read through the schema those routes apply.
 */
export function useValidatedCanonicalFilters(): FilterSearch {
  const raw = useFilters();
  return useCanonical(useMemo(() => filterSearchSchema.parse(raw), [raw]));
}

function useCanonical(filters: FilterSearch): FilterSearch {
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
        // every filtering route declares `filterSearchSchema`; `to: "."` types the
        // search loosely across them, so the updater's own types do the checking
        to: ".",
        // `replace`: a filter is a view of one page, not a place to go back to
        replace: true,
        // the grid the user is looking at should not jump to the top on every filter
        resetScroll: false,
        search: (prev: FilterSearch): FilterSearch => withoutEmpty({ ...prev, ...patch }),
      });
    },
    [navigate],
  );
}

/** A facet control's change, an empty pick dropping its key from the URL. */
export function useSetFacet(): (patch: FacetPatch) => void {
  const setFilters = useSetFilters();
  return useCallback(
    (patch: FacetPatch) =>
      setFilters(
        Object.fromEntries(
          Object.entries(patch).map(([key, value]) => [key, value.length > 0 ? value : undefined]),
        ),
      ),
    [setFilters],
  );
}

export function useResetFilters(): () => void {
  const setFilters = useSetFilters();
  return useCallback(() => {
    noteFilterReset();
    setFilters(resetPatch);
  }, [setFilters]);
}
