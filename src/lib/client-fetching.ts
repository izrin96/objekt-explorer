import { fetchUserByIdentifier } from "./server/auth";
import { cache } from "react";
import { fetchLiveSession } from "./server/cosmo/live";
import { getAccessToken } from "./server/token";

export const getUserByIdentifier = cache(async (identifier: string) => {
  // const accessToken = await getAccessToken();
  return await fetchUserByIdentifier(identifier);
});

export const getLiveSession = cache(async (id: string) => {
  const accessToken = await getAccessToken();
  return await fetchLiveSession(accessToken.accessToken, id);
});
