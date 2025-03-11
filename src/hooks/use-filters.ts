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
import { GRID_COLUMNS } from "@/lib/utils";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
  parseAsBoolean,
  parseAsInteger,
} from "nuqs";

export function useFilters() {
  return useQueryStates({
    member: parseAsArrayOf(parseAsString),
    artist: parseAsArrayOf(
      parseAsStringEnum<ValidArtist>(Object.values(validArtists))
    ),
    sort: parseAsStringEnum<ValidSort>(Object.values(validSorts)).withDefault(
      "date"
    ),
    class: parseAsArrayOf(
      parseAsStringEnum<ValidClass>(Object.values(validClasses))
    ),
    season: parseAsArrayOf(
      parseAsStringEnum<ValidSeason>(Object.values(validSeasons))
    ),
    on_offline: parseAsArrayOf(
      parseAsStringEnum<ValidOnlineType>(Object.values(validOnlineTypes))
    ),
    transferable: parseAsBoolean.withDefault(false),
    search: parseAsString.withDefault(""),
    grouped: parseAsBoolean.withDefault(false),
    column: parseAsInteger.withDefault(GRID_COLUMNS),
    group_by: parseAsStringEnum<ValidGroupBy>(Object.values(validGroupBy)),
    group_bys: parseAsArrayOf(
      parseAsStringEnum<ValidGroupBy>(Object.values(validGroupBy))
    ),
    sort_dir: parseAsStringEnum<ValidSortDirection>(
      Object.values(validSortDirection)
    ).withDefault("desc"),
    group_dir: parseAsStringEnum<ValidSortDirection>(
      Object.values(validSortDirection)
    ).withDefault("desc"),
    unowned: parseAsBoolean.withDefault(false),
    edition: parseAsArrayOf(
      parseAsStringEnum<ValidEdition>(Object.values(validEdition))
    ),
  });
}

export type Filters = ReturnType<typeof useFilters>[0];
