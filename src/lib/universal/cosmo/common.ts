export const COSMO_ENDPOINT = "https://api.cosmo.fans";

// artists
export const validArtists = ["artms", "tripleS"] as const;
export type ValidArtist = (typeof validArtists)[number];

// sort values
export const validSorts = [
  "newest",
  "oldest",
  "newestSeason",
  "oldestSeason",
  "noDescending",
  "noAscending",
  "serialDesc",
  "serialAsc",
  "duplicateDesc",
  "duplicateAsc",
] as const;
export type ValidSort = (typeof validSorts)[number];

// seasons
export const validSeasons = [
  "Atom01",
  "Binary01",
  "Cream01",
  "Divine01",
  "Ever01",
] as const;
export type ValidSeason = (typeof validSeasons)[number];

// classes
export const validClasses = [
  "First",
  "Special",
  "Double",
  "Premier",
  "Welcome",
  "Zero",
] as const;
export type ValidClass = (typeof validClasses)[number];

export const validGroupBy = [
  "season",
  "member",
  "class",
  "collectionNo",
] as const;
export type ValidGroupBy = (typeof validGroupBy)[number];

// online types
export const validOnlineTypes = ["online", "offline"] as const;
export type ValidOnlineType = (typeof validOnlineTypes)[number];
