import type { CollectionFilters } from "@repo/api/schemas/common/filters";

import { defaultFilters, type FilterSearch } from "./search-schema";

/** What a picker in a dialog narrows by; empty arrays mean no filter. */
export type PickerFacetFilters = Pick<
  CollectionFilters,
  "artist" | "member" | "season" | "class" | "on_offline" | "collection"
> & {
  search: string;
};

export const NO_PICKER_FILTERS: PickerFacetFilters = {
  search: "",
  artist: [],
  member: [],
  season: [],
  class: [],
  on_offline: [],
  collection: [],
};

const FACET_FIELDS = ["artist", "member", "season", "class", "on_offline", "collection"] as const;

/** How many facets hold a value. */
export const pickerFacetCount = (filters: PickerFacetFilters) =>
  FACET_FIELDS.reduce((sum, key) => sum + (filters[key].length > 0 ? 1 : 0), 0);

export const pickerFiltered = (filters: PickerFacetFilters) =>
  filters.search.trim().length > 0 || pickerFacetCount(filters) > 0;

/** For `filterObjekts`, which reads an empty array as "matches nothing". */
export const toFilterSearch = (filters: PickerFacetFilters): FilterSearch => ({
  ...defaultFilters,
  search: filters.search || undefined,
  artist: filters.artist.length > 0 ? filters.artist : undefined,
  member: filters.member.length > 0 ? filters.member : undefined,
  season: filters.season.length > 0 ? filters.season : undefined,
  class: filters.class.length > 0 ? filters.class : undefined,
  on_offline: filters.on_offline.length > 0 ? filters.on_offline : undefined,
  collection: filters.collection.length > 0 ? filters.collection : undefined,
});
