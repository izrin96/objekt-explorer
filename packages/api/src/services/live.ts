import { fetchLiveSessions } from "@repo/cosmo/server/live";
import type { ValidArtist } from "@repo/cosmo/types/common";
import type { LiveSession } from "@repo/cosmo/types/live";

import { getCache } from "./redis";
import { getAccessToken } from "./token";

export async function fetchArtistLiveSessions(artistId: ValidArtist): Promise<LiveSession[]> {
  return getCache(`live:${artistId}`, 30, async () => {
    const { accessToken } = await getAccessToken();
    return fetchLiveSessions(accessToken, artistId);
  });
}
