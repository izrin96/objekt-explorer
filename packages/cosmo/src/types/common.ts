/**
 * todo: remove validSeason, validClasses etc and replace with just string
 */

export const COSMO_ENDPOINT = "https://api.cosmo.fans";

// artists
export const validArtists = ["artms", "tripleS", "idntt"] as const;
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
] as const;
export type ValidCustomSort = (typeof validCustomSorts)[number];

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
  "#FAD900",
  "#69FB3C",
  // for idntt
  "#25347C",
  "#619AFF",
  "#B5315A",
  "#C6C6C6",
] as const;
export const validSeasons = [
  "Atom01",
  "Binary01",
  "Cream01",
  "Divine01",
  "Ever01",
  "Atom02",
  "Binary02",
  // for idntt
  "Spring25",
  "Summer25",
  "Autumn25",
  "Winter26",
] as const;
export type ValidSeason = (typeof validSeasons)[number];

export const validFourSeason = ["Spring", "Summer", "Autumn", "Winter"] as const;
export type ValidFourSeason = (typeof validFourSeason)[number];

// classes
export const validClasses = [
  "First",
  "Basic",
  "Double",
  "Event",
  "Unit",
  "Motion",
  "Special",
  "Premier",
  "Welcome",
  "Zero",
] as const;
export type ValidClass = (typeof validClasses)[number];

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
