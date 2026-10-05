import { ORPCError } from "@orpc/server";
import { getRequestHeaders } from "@tanstack/react-start/server";
import * as z from "zod";

import { pub } from "../orpc";
import { artistSchema } from "../schemas/artist";
import { fetchArtistLiveSessions } from "../services/live";
import { isIpRateLimited } from "../services/redis";

export const liveRouter = {
  sessions: pub
    .route({
      method: "GET",
      path: "/live-sessions",
      tags: ["Live"],
      summary: "An artist's live sessions",
    })
    .input(z.object({ artistId: artistSchema }))
    .handler(async ({ input: { artistId }, context }) => {
      if (await isIpRateLimited("live-sessions", context.headers ?? getRequestHeaders())) {
        throw new ORPCError("TOO_MANY_REQUESTS");
      }
      return fetchArtistLiveSessions(artistId);
    }),
};
