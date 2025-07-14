import type { ValidArtist, ValidClass, ValidSeason } from "./common";

export type SeasonArtist = {
  artistId: ValidArtist;
  seasons: ValidSeason[];
};

export const seasonArtist: SeasonArtist[] = [
  {
    artistId: "tripleS",
    seasons: ["Atom01", "Binary01", "Cream01", "Divine01", "Ever01", "Atom02"],
  },
  {
    artistId: "artms",
    seasons: ["Atom01", "Binary01", "Cream01", "Divine01"],
  },
  {
    artistId: "idntt",
    seasons: ["Spring25", "Summer25"],
  },
];

export type ClassArtist = {
  artistId: ValidArtist;
  classes: ValidClass[];
};

export const classArtist: ClassArtist[] = [
  {
    artistId: "tripleS",
    classes: ["First", "Special", "Double", "Premier", "Welcome", "Zero"],
  },
  {
    artistId: "artms",
    classes: ["First", "Special", "Double", "Premier", "Welcome"],
  },
  {
    artistId: "idntt",
    classes: ["Basic", "Event", "Special", "Welcome"],
  },
];
