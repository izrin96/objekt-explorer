import {
  validArtists,
  validClasses,
  validSeasons,
  validSorts,
  ValidArtist,
  ValidClass,
  ValidOnlineType,
  validOnlineTypes,
  ValidSeason,
  ValidSort,
  ValidGroupBy,
  validGroupBy,
  ValidSortDirection,
  validSortDirection,
  ValidEdition,
  validEdition,
} from "@/lib/universal/cosmo/common";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
  parseAsBoolean,
} from "nuqs";

export function useFilters() {
  return useQueryStates({
    member: parseAsArrayOf(parseAsString),
    artist: parseAsArrayOf(
      parseAsStringEnum<ValidArtist>(Object.values(validArtists))
    ),
    sort: parseAsStringEnum<ValidSort>(Object.values(validSorts)),
    class: parseAsArrayOf(
      parseAsStringEnum<ValidClass>(Object.values(validClasses))
    ),
    season: parseAsArrayOf(
      parseAsStringEnum<ValidSeason>(Object.values(validSeasons))
    ),
    on_offline: parseAsArrayOf(
      parseAsStringEnum<ValidOnlineType>(Object.values(validOnlineTypes))
    ),
    transferable: parseAsBoolean,
    search: parseAsString,
    grouped: parseAsBoolean,
    group_by: parseAsStringEnum<ValidGroupBy>(Object.values(validGroupBy)),
    group_bys: parseAsArrayOf(
      parseAsStringEnum<ValidGroupBy>(Object.values(validGroupBy))
    ),
    sort_dir: parseAsStringEnum<ValidSortDirection>(
      Object.values(validSortDirection)
    ),
    group_dir: parseAsStringEnum<ValidSortDirection>(
      Object.values(validSortDirection)
    ),
    unowned: parseAsBoolean,
    edition: parseAsArrayOf(
      parseAsStringEnum<ValidEdition>(Object.values(validEdition))
    ),
    hidePin: parseAsBoolean,
  });
}

export type Filters = ReturnType<typeof useFilters>[0];

export function checkFiltering(filters: Filters) {
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
    filters.hidePin !== null
  );
}
