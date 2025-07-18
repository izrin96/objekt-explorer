import { cookies } from "next/headers";
import { cache } from "react";
import { fetchUserByIdentifier } from "./server/auth";
import { fetchLiveSession } from "./server/cosmo/live";
import { getAccessToken } from "./server/token";
import type { ValidArtist } from "./universal/cosmo/common";

export const getUserByIdentifier = cache(async (identifier: string) => {
  return await fetchUserByIdentifier(identifier);
});

export const getLiveSession = cache(async (id: string) => {
  const accessToken = await getAccessToken();
  return await fetchLiveSession(accessToken.accessToken, id);
});

export const getSelectedArtists = cache(async () => {
  const cookie = await cookies();
  const value = cookie.get("artists")?.value;

  if (value === undefined) return [];

  try {
    return JSON.parse(value) as ValidArtist[];
  } catch {
    return [];
  }
});

export const setSelectedArtists = cache(async () => {});
