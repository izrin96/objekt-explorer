import { validType, type ValidType } from "@repo/api/schemas/transfers";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import * as z from "zod";

import { defaultFilters, filterSearchSchema } from "@/features/filters/search-schema";

const { at: _at, ...resetPatch } = defaultFilters;

/**
 * Trades share every facet with the grids and add the transfer type, so the
 * table a link opens is the table the link was written on.
 */
export const tradesSearchSchema = filterSearchSchema.extend({
  type: z.enum(validType).optional().catch(undefined),
});

type TradesSearch = z.infer<typeof tradesSearchSchema>;

/** `all` is the absence of the parameter, so a default view carries no key. */
export function useTradesType(): ValidType {
  return useSearch({
    strict: false,
    select: (search) => (search as TradesSearch).type ?? "all",
  });
}

export function useSetTradesType(): (type: ValidType) => void {
  const navigate = useNavigate();
  return useCallback(
    (type: ValidType) => {
      void navigate({
        replace: true,
        resetScroll: false,
        search: ((prev: TradesSearch) => ({
          ...prev,
          type: type === "all" ? undefined : type,
        })) as never,
      });
    },
    [navigate],
  );
}

/** One navigation clears the facets and the type together; `at` scopes the
 *  table rather than filtering it, so it survives, as it does on the grids. */
export function useResetTrades(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    void navigate({
      replace: true,
      resetScroll: false,
      search: ((prev: TradesSearch) => ({ ...resetPatch, at: prev.at })) as never,
    });
  }, [navigate]);
}
