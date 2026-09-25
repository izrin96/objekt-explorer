import { artistSchema } from "@repo/api/schemas/artist";
import { rateLimit } from "@repo/api/services/redis";
import { getAccessToken } from "@repo/api/services/token";
import { fetchLiveSessions } from "@repo/cosmo/server/live";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const querySchema = z.object({
  artistId: artistSchema,
});

const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60;

export const Route = createFileRoute("/api/live-sessions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse({ artistId: url.searchParams.get("artistId") });

        if (!parsed.success) {
          return Response.json(
            { status: "error", validationErrors: z.treeifyError(parsed.error) },
            { status: 400 },
          );
        }

        // best-effort per-IP rate limit to protect the upstream Cosmo API.
        // Traefik overwrites x-real-ip with the peer address; any other header
        // arrives as the client wrote it.
        const ip = request.headers.get("x-real-ip") ?? "unknown";
        const attempts = await rateLimit(`live-sessions:rl:${ip}`, RATE_WINDOW_SECONDS);
        if (attempts > RATE_LIMIT) {
          return Response.json({ status: "error", message: "Too many requests" }, { status: 429 });
        }

        const { accessToken } = await getAccessToken();
        const sessions = await fetchLiveSessions(accessToken, parsed.data.artistId);

        return Response.json(sessions);
      },
    },
  },
});
