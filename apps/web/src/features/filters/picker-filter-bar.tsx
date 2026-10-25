import type { CollectionFilters } from "@repo/api/schemas/common/filters";
import { type ReactNode, useState } from "react";

import { FacetControls } from "./facet-controls";
import { useScopedFacets } from "./facets";
import { PickerSearchField } from "./filter-search";
import { ResetButton } from "./reset-button";
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

export const pickerFiltered = (filters: PickerFacetFilters) =>
  filters.search.trim().length > 0 ||
  filters.artist.length +
    filters.member.length +
    filters.season.length +
    filters.class.length +
    filters.on_offline.length +
    filters.collection.length >
    0;

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

/**
 * The filters the pickers share, as the page toolbar draws them. `source` picks where the
 * objekts come from (a list, a profile) and follows the filters; `children` adds a picker's
 * own controls after Reset.
 */
export function PickerFilterBar<F extends PickerFacetFilters>({
  filters,
  onChange,
  source,
  children,
}: {
  filters: F;
  onChange: (next: F) => void;
  source?: ReactNode;
  children?: ReactNode;
}) {
  const { facets, groups } = useScopedFacets();
  // the search field keeps its own draft, so a reset remounts it to clear the text
  const [searchKey, setSearchKey] = useState(0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PickerSearchField key={searchKey} onCommit={(search) => onChange({ ...filters, search })} />
      <FacetControls
        surface="inline"
        facets={facets}
        groups={groups}
        values={filters}
        onChange={(patch) => onChange({ ...filters, ...patch })}
        noSheet
      />
      {source}
      <ResetButton
        disabled={!pickerFiltered(filters)}
        onReset={() => {
          setSearchKey((key) => key + 1);
          onChange({ ...filters, ...NO_PICKER_FILTERS });
        }}
      />
      {children}
    </div>
  );
}
