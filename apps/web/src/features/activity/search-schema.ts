import { validType, type ValidType } from "@repo/api/schemas/activity";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import * as z from "zod";

import { defaultFilters, filterSearchSchema } from "@/features/filters/search-schema";

/** `at` scopes a surface rather than filtering it, and the feed has no use for it. */
const { at: _at, ...resetPatch } = defaultFilters;

/**
 * The feed shares every facet with the grids and adds the event type, so a
 * link written on either surface keeps the facets it has in common.
 */
export const activitySearchSchema = filterSearchSchema.extend({
  type: z.enum(validType).optional().catch(undefined),
});

type ActivitySearch = z.infer<typeof activitySearchSchema>;

/** `all` is the absence of the parameter, so a default view carries no key. */
export function useActivityType(): ValidType {
  return useSearch({
    strict: false,
    select: (search) => (search as ActivitySearch).type ?? "all",
  });
}

export function useSetActivityType(): (type: ValidType) => void {
  const navigate = useNavigate();
  return useCallback(
    (type: ValidType) => {
      void navigate({
        replace: true,
        resetScroll: false,
        search: ((prev: ActivitySearch) => ({
          ...prev,
          type: type === "all" ? undefined : type,
        })) as never,
      });
    },
    [navigate],
  );
}

/** One navigation clears the facets and the event together. */
export function useResetActivity(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    void navigate({ replace: true, resetScroll: false, search: (() => resetPatch) as never });
  }, [navigate]);
}
