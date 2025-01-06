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
} from "@/lib/universal/cosmo/common";
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
    artist: parseAsStringEnum<ValidArtist>(Object.values(validArtists)),
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
    gridable: parseAsBoolean,
    used_for_grid: parseAsBoolean,
    search: parseAsString,
    grouped: parseAsBoolean,
    column: parseAsInteger,
  });
}

export type Filters = ReturnType<typeof useFilters>[0];
