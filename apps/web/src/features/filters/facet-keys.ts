import type { ComponentType } from "react";

import type { FilterSearch } from "./search-schema";

/** the URL keys the facet row owns, in the order it shows them */
export const FACET_KEYS = [
  "artist",
  "member",
  "season",
  "class",
  "collection",
  "on_offline",
] as const;

export type FacetKey = (typeof FACET_KEYS)[number];

export type FacetValues = Record<FacetKey, string[]>;

/** A facet change; picking artists also drops the members they don't have. */
export type FacetPatch = Partial<FacetValues>;

export const facetValues = (filters: Pick<FilterSearch, FacetKey>): FacetValues => ({
  artist: filters.artist ?? [],
  member: filters.member ?? [],
  season: filters.season ?? [],
  class: filters.class ?? [],
  collection: filters.collection ?? [],
  on_offline: filters.on_offline ?? [],
});

/** the facets a phone keeps on the toolbar; the rest live in the Filters sheet only */
export const QUICK_FACET_KEYS: readonly FacetKey[] = ["artist", "member", "season", "class"];

export type FacetSurface = "inline" | "stacked";

/**
 * A toolbar control that is not one of the facets but still has to be on
 * both surfaces. It goes through the same parity guard as `FACETS`, and
 * declares whether it holds a non-default value so the sheet trigger's badge
 * can count it. A `quick` extra stays on the toolbar below `md` as well.
 */
export type ExtraFacet = {
  key: string;
  active: boolean;
  quick?: boolean;
  Control: ComponentType<{ className?: string }>;
};

/**
 * The default for every `extras` prop. One shared frozen array, because the
 * declared key list is memoised on the array's identity and a fresh `[]` per
 * render would re-run the parity effect forever.
 */
export const NO_EXTRAS: readonly ExtraFacet[] = [];
