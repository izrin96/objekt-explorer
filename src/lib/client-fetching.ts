import { getAccessToken } from "./server/token";
import { fetchUserByIdentifier } from "./server/auth";
import { validArtists } from "./universal/cosmo/common";
import { fetchArtistBff } from "./server/cosmo/artists";
import { redis } from "./redis-client";
import { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";

export const getArtistsWithMembers = async () => {
  const KEY = "artists"
  const cached = await redis.get(KEY);
  if (cached) return JSON.parse(cached) as CosmoArtistWithMembersBFF[];
  const result = await Promise.all(
    validArtists.map((artist) => fetchArtistBff(artist))
  );
  await redis.set(KEY, JSON.stringify(result), "EX", 60 * 60);
  return result;
};

export const getUserByIdentifier = async (identifier: string) => {
  const accessToken = await getAccessToken();
  return await fetchUserByIdentifier(identifier, accessToken.accessToken);
};
