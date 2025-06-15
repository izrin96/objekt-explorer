import { LiveSession, OnAirResult } from "@/lib/universal/cosmo/live";
import { cosmo } from "../http";

export async function fetchLiveSessions(token: string, artistId: string) {
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

export async function fetchLiveSession(token: string, id: string) {
  return await cosmo<LiveSession>(`/bff/v3/live-sessions/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => undefined);
}

export async function fetchOnAir(token: string, artistId: string) {
  return await cosmo<OnAirResult>("/bff/v3/live-sessions/on-air", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    query: {
      artistId,
    },
  });
}
