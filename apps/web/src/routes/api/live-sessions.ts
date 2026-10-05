import { artistSchema } from "@repo/api/schemas/common/artist";
import { fetchArtistLiveSessions } from "@repo/api/services/live";
import { isIpRateLimited } from "@repo/api/services/redis";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const querySchema = z.object({
  artistId: artistSchema,
});

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

        if (await isIpRateLimited("live-sessions", request.headers)) {
          return Response.json({ status: "error", message: "Too many requests" }, { status: 429 });
        }

        return Response.json(await fetchArtistLiveSessions(parsed.data.artistId));
      },
    },
  },
});
