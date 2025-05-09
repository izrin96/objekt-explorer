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

export function withDefault(filters: Filters) {
  return {
    member: filters,
    artist: filters.artist,
    sort: filters.sort ?? "date",
    class: filters.class,
    season: filters.season,
    on_offline: filters.on_offline,
    transferable: filters.transferable ?? false,
    search: filters.search ?? "",
    grouped: filters.grouped ?? false,
    group_by: filters.group_by,
    group_bys: filters.group_bys,
    sort_dir: filters.sort_dir ?? "desc",
    group_dir: filters.group_dir ?? "desc",
    unowned: filters.unowned ?? false,
    edition: filters.edition,
    hidePin: filters.hidePin ?? false,
  };
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
    filters.edition !== null
  );
}
