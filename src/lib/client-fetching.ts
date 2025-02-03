import { cache } from "react";
import { validArtists } from "./universal/cosmo/common";
import { fetchArtistBff } from "./server/cosmo/artists";
import { getAccessToken } from "./server/token";
import { fetchUserByIdentifier } from "./server/auth";
import { fetchObjektsIndex } from "./server/objekts/objekt-index";

export const getArtistsWithMembers = cache(async () => {
  return await Promise.all(
    validArtists.map((artist) => fetchArtistBff(artist))
  );
});

export const getUserByIdentifier = cache(async (identifier: string) => {
  const accessToken = await getAccessToken();
  return await fetchUserByIdentifier(identifier, accessToken.accessToken);
});

export const getObjektsIndex = cache(async () => {
  return await fetchObjektsIndex();
});
