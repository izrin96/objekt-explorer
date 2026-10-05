import { queryOptions } from "@tanstack/react-query";

import { client } from "@/lib/orpc";

const FIVE_MINUTES = 1000 * 60 * 5;

export function liveSessionsOptions(artistId: string) {
  return queryOptions({
    queryKey: ["live-session", artistId],
    queryFn: () => client.live.sessions({ artistId }),
    staleTime: FIVE_MINUTES,
  });
}
