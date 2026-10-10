import type { CollectionFilters } from "@repo/api/schemas/common/filters";
import type { ReactNode } from "react";

import { m } from "@/paraglide/messages";

import { useScopedFacets } from "./facets";
import { PickerSearchField } from "./filter-search";
import { defaultFilters, type FilterSearch } from "./search-schema";
import { SingleSelect } from "./single-select";

/** What a picker in a dialog narrows by; empty arrays mean no filter. */
export type PickerFacetFilters = Pick<CollectionFilters, "member" | "season" | "class"> & {
  search: string;
};

export const NO_PICKER_FILTERS: PickerFacetFilters = {
  search: "",
  member: [],
  season: [],
  class: [],
};

export const pickerFiltered = (filters: PickerFacetFilters) =>
  filters.search.trim().length > 0 ||
  filters.member.length + filters.season.length + filters.class.length > 0;

/** For `filterObjekts`, which reads an empty array as "matches nothing". */
export const toFilterSearch = (filters: PickerFacetFilters): FilterSearch => ({
  ...defaultFilters,
  search: filters.search || undefined,
  member: filters.member.length > 0 ? filters.member : undefined,
  season: filters.season.length > 0 ? filters.season : undefined,
  class: filters.class.length > 0 ? filters.class : undefined,
});

const ALL = "all";

/** Quick search, member, season and class; `children` adds the picker's own controls. */
export function PickerFilterBar<F extends PickerFacetFilters>({
  filters,
  onChange,
  children,
}: {
  filters: F;
  onChange: (next: F) => void;
  children?: ReactNode;
}) {
  const { facets } = useScopedFacets();
  const select = (key: "member" | "season" | "class", label: string, values: readonly string[]) => (
    <SingleSelect
      label={label}
      options={[
        { value: ALL, label: m.filter_all() },
        ...values.map((value) => ({ value, label: value })),
      ]}
      value={filters[key][0] ?? ALL}
      defaultValue={ALL}
      onChange={(value) => onChange({ ...filters, [key]: value === ALL ? [] : [value] })}
    />
  );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <PickerSearchField onCommit={(search) => onChange({ ...filters, search })} />
      {select("member", m.filter_member(), facets.members)}
      {select("season", m.filter_season(), facets.seasons)}
      {select("class", m.filter_class(), facets.classes)}
      {children}
    </div>
  );
}
