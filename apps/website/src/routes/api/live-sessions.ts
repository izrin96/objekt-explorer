import { fetchLiveSessions } from "@repo/cosmo/server/live";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

import { rateLimit } from "@/lib/server/redis.server";
import { getAccessToken } from "@/lib/server/token.server";
import { artistSchema } from "@/lib/universal/artist";

const querySchema = z.object({
  artistId: artistSchema,
});

const RATE_LIMIT = 30; // requests
const RATE_WINDOW_SECONDS = 60;

export const Route = createFileRoute("/api/live-sessions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const queryResult = querySchema.safeParse({
          artistId: url.searchParams.get("artistId"),
        });

        if (!queryResult.success) {
          return Response.json(
            { status: "error", validationErrors: z.treeifyError(queryResult.error) },
            { status: 400 },
          );
        }

        // best-effort per-IP rate limit to protect the upstream Cosmo API
        const ip =
          request.headers.get("x-client-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
        const attempts = await rateLimit(`live-sessions:rl:${ip}`, RATE_WINDOW_SECONDS);
        if (attempts > RATE_LIMIT) {
          return Response.json({ status: "error", message: "Too many requests" }, { status: 429 });
        }

        const accessToken = await getAccessToken();
        const sessions = await fetchLiveSessions(
          accessToken.accessToken,
          queryResult.data.artistId,
        );

        return Response.json(sessions);
      },
    },
  },
});
