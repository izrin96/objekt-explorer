export const COSMO_ENDPOINT = "https://api.cosmo.fans";

// artists
export const validArtists = ["tripleS", "artms", "idntt"] as const;
export type ValidArtist = (typeof validArtists)[number];

// sort values
export const validSorts = [
  "newest",
  "oldest",
  "noAscending",
  "noDescending",
  // should not be sent to cosmo
  "serialAsc",
  "serialDesc",
] as const;
export type ValidSort = (typeof validSorts)[number];

// online types
export const validOnlineTypes = ["online", "offline"] as const;
export type ValidOnlineType = (typeof validOnlineTypes)[number];

// custom sort values
export const validCustomSorts = [
  "date",
  "season",
  "collectionNo",
  "member",
  "serial",
  "duplicate",
  "rare",
] as const;
export type ValidCustomSort = (typeof validCustomSorts)[number];

// sortDir
export const validSortDirection = ["desc", "asc"] as const;
export type ValidSortDirection = (typeof validSortDirection)[number];

export const validFourSeason = ["Winter", "Spring", "Summer", "Autumn"] as const;
export type ValidFourSeason = (typeof validFourSeason)[number];

// edition
export const validEdition = [1, 2, 3] as const;
export type ValidEdition = (typeof validEdition)[number];

// groupBy
export const validGroupBy = [
  "artist",
  "member",
  "season",
  "class",
  "collectionNo",
  "seasonCollectionNo",
] as const;
export type ValidGroupBy = (typeof validGroupBy)[number];
