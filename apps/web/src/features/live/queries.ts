import { orpc } from "@/lib/orpc";

const FIVE_MINUTES = 1000 * 60 * 5;

export function liveSessionsOptions(artistId: string) {
  return orpc.live.sessions.queryOptions({
    input: { artistId },
    staleTime: FIVE_MINUTES,
  });
}
