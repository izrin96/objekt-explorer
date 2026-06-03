import type { ValidArtist } from "../types/common";
import type { LiveSession } from "../types/live";
import { cosmo } from "./http";

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

/**
 * Fetch single live session.
 */
export async function fetchLiveSession(token: string, id: string) {
  return await cosmo<LiveSession>(`/bff/v3/live-sessions/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
