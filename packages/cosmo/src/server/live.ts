import type { ValidArtist } from "../types/common";

import { cosmo } from "./http";

export interface LiveSession {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  artistId: ValidArtist;
  // Add other fields as needed from Cosmo API
}

/**
 * Fetch live sessions for a given artist.
 */
export async function fetchLiveSessions(token: string, artistId: ValidArtist) {
  return await cosmo<LiveSession[]>("/bff/v3/live-sessions", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      skip: 0,
      take: 30,
      artistId,
    },
  });
}
