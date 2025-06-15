export const COSMO_ENDPOINT = "https://api.cosmo.fans";

// artists
export const validArtists = ["tripleS", "artms", "idntt"] as const;
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
export const validSortDirection = ["desc", "asc"] as const;
export type ValidSortDirection = (typeof validSortDirection)[number];

// seasons
export const seasonColors = [
  "#FFDD00",
  "#75FB4C",
  "#FF7477",
  "#B400FF",
  "#33ECFD",
  "#FFDD00",
  "#25347C", // Spring25
];
export const validSeasons = [
  "Atom01",
  "Binary01",
  "Cream01",
  "Divine01",
  "Ever01",
  "Atom02",
  // for idntt
  "Spring25",
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
  // for idntt
  "Basic",
  "Event",
  "ETC",
] as const;
export type ValidClass = (typeof validClasses)[number];

// edition
export const validEdition = ["1st", "2nd", "3rd"] as const;
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

// online types
export const validOnlineTypes = ["online", "offline"] as const;
export type ValidOnlineType = (typeof validOnlineTypes)[number];
