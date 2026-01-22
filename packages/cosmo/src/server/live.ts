import type { ValidArtist } from "../types/common";

import { cosmo } from "./http";

export interface LiveSession {
  id: number;
  thumbnailImage: string;
  startedAt: string;
  endedAt: string;
  videoCallId: string;
  chatChannelId: string;
  slowModeSecond: number;
  status: "in_progress" | "ended";
  createdAt: string;
  updatedAt: string;
  channel: {
    id: number;
    name: string;
    profileImageUrl: string;
    primaryColorHex: string;
    isConnected: boolean;
  };
  title: string;
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
