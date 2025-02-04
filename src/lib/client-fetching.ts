import { getAccessToken } from "./server/token";
import { fetchUserByIdentifier } from "./server/auth";
import { fetchObjektsIndex } from "./server/objekts/objekt-index";
import artists from "@/lib/server/cosmo/artists.json";
import { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";

export const getArtistsWithMembers = async () => {
  // return await Promise.all(
  //   validArtists.map((artist) => fetchArtistBff(artist))
  // );
  return artists as CosmoArtistWithMembersBFF[];
};

export const getUserByIdentifier = async (identifier: string) => {
  const accessToken = await getAccessToken();
  return await fetchUserByIdentifier(identifier, accessToken.accessToken);
};

export const getObjektsIndex = async () => {
  return await fetchObjektsIndex();
};
