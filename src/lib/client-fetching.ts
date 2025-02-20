import { getAccessToken } from "./server/token";
import { fetchUserByIdentifier } from "./server/auth";
import { validArtists } from "./universal/cosmo/common";
import { fetchArtistBff } from "./server/cosmo/artists";
import { redis } from "./redis-client";
import { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";
import { after } from "next/server";

export const getArtistsWithMembers = async () => {
  const cached = await redis.get<CosmoArtistWithMembersBFF[]>("artists");
  if (cached) return cached;
  const result = await Promise.all(
    validArtists.map((artist) => fetchArtistBff(artist))
  );
  after(async () => {
    await redis.set("artists", result, {
      ex: 24 * 60 * 60,
    });
  });
  return result;
};

export const getUserByIdentifier = async (identifier: string) => {
  const accessToken = await getAccessToken();
  return await fetchUserByIdentifier(identifier, accessToken.accessToken);
};
