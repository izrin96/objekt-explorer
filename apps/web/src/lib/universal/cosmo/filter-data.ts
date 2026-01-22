import type { ValidArtist, ValidClass } from "@repo/cosmo/types/common";

export type ClassArtist = {
  artistId: ValidArtist;
  classes: ValidClass[];
};

export const classArtistMap: ClassArtist[] = [
  {
    artistId: "tripleS",
    classes: ["First", "Double", "Motion", "Unit", "Special", "Premier", "Welcome", "Zero"],
  },
  {
    artistId: "artms",
    classes: ["First", "Double", "Motion", "Special", "Premier", "Welcome"],
  },
  {
    artistId: "idntt",
    classes: ["Basic", "Event", "Motion", "Special", "Unit", "Welcome"],
  },
];
