import { transferTypeSchema, type TransferType } from "@repo/api/schemas/transfers";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import type * as z from "zod";

import { spinsSearchSchema } from "@/features/activity/spins-search";
import { defaultFilters, filterSearchSchema } from "@/features/filters/search-schema";

const { at: _at, ...resetPatch } = defaultFilters;

/**
 * Trades share every facet with the grids and add the transfer type, so the
 * table a link opens is the table the link was written on.
 */
export const tradesSearchSchema = filterSearchSchema.extend({
  type: transferTypeSchema.optional().catch(undefined),
  spins: spinsSearchSchema,
});

type TradesSearch = z.infer<typeof tradesSearchSchema>;

/** `all` is the absence of the parameter, so a default view carries no key. */
export function useTradesType(): TransferType {
  return useSearch({
    from: "/@{$nickname}/trades",
    select: (search) => search.type ?? "all",
  });
}

export function useSetTradesType(): (type: TransferType) => void {
  const navigate = useNavigate();
  return useCallback(
    (type: TransferType) => {
      void navigate({
        from: "/@{$nickname}/trades",
        to: ".",
        replace: true,
        resetScroll: false,
        search: (prev): TradesSearch => ({
          ...prev,
          type: type === "all" ? undefined : type,
        }),
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
      from: "/@{$nickname}/trades",
      to: ".",
      replace: true,
      resetScroll: false,
      search: (prev): TradesSearch => ({ ...resetPatch, at: prev.at, spins: prev.spins }),
    });
  }, [navigate]);
}
