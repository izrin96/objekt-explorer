import { ORPCError } from "@orpc/server";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { pub } from "../orpc";
import { documented, errorResponses } from "../schemas/common/documented";
import { liveSessionsInputSchema, liveSessionsOutputSchema } from "../schemas/live";
import { fetchArtistLiveSessions } from "../services/live";
import { isIpRateLimited } from "../services/redis";

export const liveRouter = {
  sessions: pub
    .route({
      method: "GET",
      path: "/live-sessions",
      tags: ["Live"],
      summary: "An artist's live sessions",
      spec: errorResponses(400, 429),
    })
    .input(liveSessionsInputSchema)
    .output(documented(liveSessionsOutputSchema, { open: true }))
    .handler(async ({ input: { artistId }, context }) => {
      if (await isIpRateLimited("live-sessions", context.headers ?? getRequestHeaders())) {
        throw new ORPCError("TOO_MANY_REQUESTS");
      }
      return fetchArtistLiveSessions(artistId);
    }),
};
