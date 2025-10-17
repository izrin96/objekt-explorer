import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsFloat,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import {
  type ValidArtist,
  type ValidClass,
  type ValidEdition,
  type ValidGroupBy,
  type ValidOnlineType,
  type ValidSeason,
  type ValidSort,
  type ValidSortDirection,
  validArtists,
  validClasses,
  validEdition,
  validGroupBy,
  validOnlineTypes,
  validSeasons,
  validSortDirection,
  validSorts,
} from "@/lib/universal/cosmo/common";

export function useFilters() {
  return useQueryStates({
    member: parseAsArrayOf(parseAsString),
    artist: parseAsArrayOf(parseAsStringEnum<ValidArtist>(Object.values(validArtists))),
    sort: parseAsStringEnum<ValidSort>(Object.values(validSorts)),
    class: parseAsArrayOf(parseAsStringEnum<ValidClass>(Object.values(validClasses))),
    season: parseAsArrayOf(parseAsStringEnum<ValidSeason>(Object.values(validSeasons))),
    on_offline: parseAsArrayOf(parseAsStringEnum<ValidOnlineType>(Object.values(validOnlineTypes))),
    transferable: parseAsBoolean,
    search: parseAsString,
    grouped: parseAsBoolean,
    group_by: parseAsStringEnum<ValidGroupBy>(Object.values(validGroupBy)),
    group_bys: parseAsArrayOf(parseAsStringEnum<ValidGroupBy>(Object.values(validGroupBy))),
    sort_dir: parseAsStringEnum<ValidSortDirection>(Object.values(validSortDirection)),
    group_dir: parseAsStringEnum<ValidSortDirection>(Object.values(validSortDirection)),
    unowned: parseAsBoolean,
    edition: parseAsArrayOf(parseAsStringEnum<ValidEdition>(Object.values(validEdition))),
    hidePin: parseAsBoolean,
    color: parseAsString,
    colorSensitivity: parseAsFloat,
    collection: parseAsArrayOf(parseAsString),
    locked: parseAsBoolean,
  });
}

export type Filters = ReturnType<typeof useFilters>[0];

export function useIsFiltering() {
  const [filters] = useFilters();
  return isFiltering(filters);
}

function isFiltering(filters: Filters) {
  return (
    filters.member !== null ||
    filters.artist !== null ||
    filters.sort !== null ||
    filters.class !== null ||
    filters.season !== null ||
    filters.on_offline !== null ||
    filters.transferable !== null ||
    filters.search !== null ||
    filters.grouped !== null ||
    filters.group_by !== null ||
    filters.group_bys !== null ||
    filters.sort_dir !== null ||
    filters.group_dir !== null ||
    filters.unowned !== null ||
    filters.edition !== null ||
    filters.hidePin !== null ||
    filters.color !== null ||
    filters.colorSensitivity !== null ||
    filters.collection !== null ||
    filters.locked !== null
  );
}
