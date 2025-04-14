import { getAccessToken } from "./server/token";
import { fetchUserByIdentifier } from "./server/auth";
import { ValidArtist } from "./universal/cosmo/common";
import { fetchSeasons } from "./server/cosmo/season";
import { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";
import artists from "./server/cosmo/artists.json";
import { cache } from "react";

export const getArtistsWithMembers = cache(async () => {
  return artists as CosmoArtistWithMembersBFF[];
});

export const getUserByIdentifier = cache(async (identifier: string) => {
  const accessToken = await getAccessToken();
  return await fetchUserByIdentifier(identifier, accessToken.accessToken);
});

export const getSeasons = cache(async (artist: ValidArtist) => {
  const accessToken = await getAccessToken();
  return await fetchSeasons(accessToken.accessToken, artist);
});
