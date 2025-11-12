import type { ValidArtist, ValidClass } from "./common";

export type ClassArtist = {
  artistId: ValidArtist;
  classes: ValidClass[];
};

export const classArtistMap: ClassArtist[] = [
  {
    artistId: "tripleS",
    classes: ["First", "Special", "Motion", "Double", "Premier", "Welcome", "Zero"],
  },
  {
    artistId: "artms",
    classes: ["First", "Special", "Double", "Premier", "Welcome"],
  },
  {
    artistId: "idntt",
    classes: ["Basic", "Event", "Special", "Unit", "Welcome"],
  },
];
