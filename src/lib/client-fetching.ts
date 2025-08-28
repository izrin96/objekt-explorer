import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchUserByIdentifier } from "./server/auth";
import { fetchLiveSession } from "./server/cosmo/live";
import { getAccessToken } from "./server/token";
import type { ValidArtist } from "./universal/cosmo/common";

export const getUserByIdentifier = cache(async (identifier: string) => {
  const user = await fetchUserByIdentifier(identifier);
  if (!user) notFound();
  return user;
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
