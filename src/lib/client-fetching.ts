import { getAccessToken } from "./server/token";
import { fetchUserByIdentifier } from "./server/auth";
import { ValidArtist, validArtists } from "./universal/cosmo/common";
import { fetchArtistBff } from "./server/cosmo/artists";
import { fetchSeasons } from "./server/cosmo/season";
import { redis } from "./redis-client";
import { CosmoArtistWithMembersBFF } from "./universal/cosmo/artists";
import { after } from "next/server";
import { cache } from "react";

export const getArtistsWithMembers = cache(async () => {
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
});

export const getUserByIdentifier = cache(async (identifier: string) => {
  const accessToken = await getAccessToken();
  return await fetchUserByIdentifier(identifier, accessToken.accessToken);
});

export const getSeasons = cache(async (artist: ValidArtist) => {
  const accessToken = await getAccessToken();
  return await fetchSeasons(accessToken.accessToken, artist);
});
