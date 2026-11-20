import { LOADER_READ_STALE_MS, orpc } from "@/lib/orpc";

export const collectionOverridesOptions = () =>
  orpc.admin.collectionOverrides.queryOptions({ staleTime: LOADER_READ_STALE_MS, retry: false });

/** Per collection number, Cosmo's agreed text colour for members with no read yet. */
export const collectionSuggestionsOptions = () =>
  orpc.admin.collectionSuggestions.queryOptions({ staleTime: LOADER_READ_STALE_MS, retry: false });

/** Counts and one time about the connected Cosmo sessions, for the line above the table. */
export const cosmoMediaSummaryOptions = orpc.admin.cosmoMediaSummary.queryOptions({
  staleTime: 60_000,
  retry: false,
});
