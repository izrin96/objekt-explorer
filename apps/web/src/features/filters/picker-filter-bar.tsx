import type { CollectionFilters } from "@repo/api/schemas/common/filters";
import { validOnlineTypes } from "@repo/cosmo/types/common";
import type { ReactNode } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { m } from "@/paraglide/messages";

import { useScopedFacets } from "./facets";
import { PickerSearchField } from "./filter-search";
import { ONLINE_TYPE_LABEL } from "./labels";
import { defaultFilters, type FilterSearch } from "./search-schema";
import { SingleSelect } from "./single-select";

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

const ALL = "all";

/** The filters the pickers share; `children` adds a picker's own controls. */
export function PickerFilterBar<F extends PickerFacetFilters>({
  filters,
  onChange,
  leading,
  children,
}: {
  filters: F;
  onChange: (next: F) => void;
  leading?: ReactNode;
  children?: ReactNode;
}) {
  const { facets, groups } = useScopedFacets();
  const { getArtist } = useCosmoArtist();
  const picked = filters.artist[0];
  const members = picked
    ? (groups.find((group) => group.artist.id === picked)?.members ?? [])
    : facets.members;
  const select = (
    key: "member" | "season" | "class" | "collection",
    label: string,
    values: readonly string[],
  ) => (
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
      {leading}
      <PickerSearchField onCommit={(search) => onChange({ ...filters, search })} />
      <SingleSelect
        label={m.filter_artist()}
        options={[
          { value: ALL, label: m.filter_all() },
          ...facets.artists.map((value) => ({ value, label: getArtist(value)?.title ?? value })),
        ]}
        value={picked ?? ALL}
        defaultValue={ALL}
        onChange={(value) => {
          const artist = value === ALL ? [] : [value as F["artist"][number]];
          const group = groups.find((g) => g.artist.id === value)?.members;
          const member = filters.member.filter((name) => !group || group.includes(name));
          onChange({ ...filters, artist, member });
        }}
      />
      {select("member", m.filter_member(), members)}
      {select("season", m.filter_season(), facets.seasons)}
      {select("class", m.filter_class(), facets.classes)}
      <SingleSelect
        label={m.filter_type()}
        options={[
          { value: ALL, label: m.filter_all() },
          ...validOnlineTypes.map((value) => ({ value, label: ONLINE_TYPE_LABEL[value]() })),
        ]}
        value={filters.on_offline[0] ?? ALL}
        defaultValue={ALL}
        onChange={(value) =>
          onChange({
            ...filters,
            on_offline: value === ALL ? [] : [value as F["on_offline"][number]],
          })
        }
      />
      {select("collection", m.filter_collection_no(), facets.collectionNos)}
      {children}
    </div>
  );
}
