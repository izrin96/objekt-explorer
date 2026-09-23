import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import * as z from "zod";

/** `lib/universal/compare.ts` in the app, minus the server input schema */
export const targetTypeSchema = z.enum(["profile", "list"]);
export const modeSchema = z.enum(["missing", "matches"]);

/**
 * Compare is not a page: it is three params on the list detail route. The app
 * reads them with nuqs; the lab has no nuqs, so they are the route's
 * `validateSearch` and this hook is the `use-compare-filters.ts` equivalent.
 *
 * All three are optional because two thirds of a comparison is not one —
 * `isComparing` is the only reader that decides.
 */
export const compareSearchSchema = z.object({
  cmp_type: targetTypeSchema.optional(),
  cmp_to: z.string().optional(),
  cmp_mode: modeSchema.optional(),
});

export type CompareFilters = z.infer<typeof compareSearchSchema>;

/** the same three params once all of them are set */
export type ActiveCompare = { [K in keyof CompareFilters]-?: NonNullable<CompareFilters[K]> };

export function isComparing(f: CompareFilters): f is ActiveCompare {
  return f.cmp_type !== undefined && f.cmp_to !== undefined && f.cmp_mode !== undefined;
}

/** the route the three params live on; a literal, so `compare/` never imports the route */
const FROM = "/list/$slug";

/**
 * `[filters, set]`, shaped like the app's `useQueryStates` pair. `set(null)`
 * drops all three, which is what the banner's Cancel does; navigating to
 * another list drops them too, since they are that route's search.
 */
export function useCompareFilters(): [CompareFilters, (next: ActiveCompare | null) => void] {
  const search = useSearch({ from: FROM });
  const navigate = useNavigate({ from: FROM });

  const set = useCallback(
    (next: ActiveCompare | null) => {
      void navigate({ search: next ?? {}, replace: next === null });
    },
    [navigate],
  );

  return [search, set];
}
