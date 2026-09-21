import { fetchArtist, fetchArtists } from "@repo/cosmo/server/artists";
import type { CosmoMemberBFF } from "@repo/cosmo/types/artists";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { validArtists } from "@repo/cosmo/types/common";

import { getCache } from "./redis";
import { getAccessToken } from "./token";

const missingMembers: CosmoMemberBFF[] = [
  {
    id: 32,
    name: "MinGyeol",
    units: "unevermet",
    alias: "id3",
    profileImageUrl:
      "https://static.cosmo.fans/uploads/member-profile/idntt-%EB%AF%BC%EA%B2%B0.jpg",
    backgroundImageUrl: "",
    order: 3,
    createdAt: "2025-07-11T15:06:23.618Z",
    updatedAt: "2025-07-11T15:06:23.618Z",
    mainObjektImageUrl: null,
    artistId: "idntt",
    primaryColorHex: "#C4624E",
  },
];

export function getArtists() {
  return getCache("artists", 60 * 60, async () => {
    const { accessToken } = await getAccessToken();
    const artists = await fetchArtists(accessToken);
    const artistMembers = await Promise.all(
      artists.map((artist) => fetchArtist(accessToken, artist.name)),
    );

    const idnttArtist = artistMembers.find((a) => a.name === "idntt");
    if (idnttArtist) {
      idnttArtist.artistMembers.push(...missingMembers);
      idnttArtist.artistMembers.sort((a, b) => a.order - b.order);
    }

    artistMembers.sort((a, b) => {
      const aIndex = validArtists.indexOf(a.name as ValidArtist);
      const bIndex = validArtists.indexOf(b.name as ValidArtist);
      return aIndex - bIndex;
    });

    return artistMembers;
  });
}
