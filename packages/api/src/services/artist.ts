import { fetchArtist, fetchArtists } from "@repo/cosmo/server/artists";
import type { CosmoArtistWithMembersBFF, CosmoMemberBFF } from "@repo/cosmo/types/artists";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { validArtists } from "@repo/cosmo/types/common";

import snapshot from "../data/artists.json";
import { getStaleCache } from "./redis";
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

/**
 * Every artist and its members. The root loader awaits this on every page, so it never waits on
 * Cosmo once a list is stored (`getStaleCache`), and with none stored and Cosmo down it serves
 * the snapshot in `data/artists.json`.
 */
export async function getArtists() {
  try {
    return await getStaleCache("artists", 60 * 60, fetchArtistsFromCosmo);
  } catch {
    return structuredClone(snapshot) as CosmoArtistWithMembersBFF[];
  }
}

async function fetchArtistsFromCosmo() {
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

  // a broken answer must not replace the last good list
  const missing = validArtists.filter(
    (name) => !artistMembers.some((a) => a.name === name && a.artistMembers.length > 0),
  );
  if (missing.length > 0) throw new Error(`Cosmo returned no members for ${missing.join(", ")}`);

  return artistMembers;
}
