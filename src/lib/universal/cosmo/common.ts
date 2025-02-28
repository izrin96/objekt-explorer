export const COSMO_ENDPOINT = "https://api.cosmo.fans";

// artists
export const validArtists = ["artms", "tripleS"] as const;
export type ValidArtist = (typeof validArtists)[number];

// sort values
export const validSorts = [
  "date",
  "season",
  "collectionNo",
  "member",
  "serial",
  "duplicate",
] as const;
export type ValidSort = (typeof validSorts)[number];

// sortDir
export const validSortDirection = [
  "desc",
  "asc",
] as const;
export type ValidSortDirection = (typeof validSortDirection)[number];

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

// online types
export const validOnlineTypes = ["online", "offline"] as const;
export type ValidOnlineType = (typeof validOnlineTypes)[number];
