import type { LiveSession } from "@repo/cosmo/types/live";
import { queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

const FIVE_MINUTES = 1000 * 60 * 5;

export function liveSessionsOptions(artistId: string) {
  return queryOptions({
    queryKey: ["live-session", artistId],
    queryFn: () => ofetch<LiveSession[]>("/api/live-sessions", { query: { artistId } }),
    staleTime: FIVE_MINUTES,
  });
}
