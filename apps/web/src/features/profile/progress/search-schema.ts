import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import * as z from "zod";

import { filterSearchSchema } from "@/features/filters/search-schema";

/**
 * Progress shares every filter with the grids and adds how many copies of a
 * collection the profile holds, which only a completion view has room to show.
 */
export const progressSearchSchema = filterSearchSchema.extend({
  showCount: z
    .preprocess((value) => (typeof value === "string" ? value === "true" : value), z.boolean())
    .optional()
    .catch(undefined),
});

type ProgressSearch = z.infer<typeof progressSearchSchema>;

export function useShowCount(): boolean {
  return useSearch({
    strict: false,
    select: (search) => (search as ProgressSearch).showCount === true,
  });
}

export function useSetShowCount(): (showCount: boolean) => void {
  const navigate = useNavigate();
  return useCallback(
    (showCount: boolean) => {
      void navigate({
        replace: true,
        resetScroll: false,
        search: ((prev: ProgressSearch) => ({
          ...prev,
          showCount: showCount || undefined,
        })) as never,
      });
    },
    [navigate],
  );
}
