import { fetchLiveSessions } from "@repo/cosmo/server/live";
import { validArtists } from "@repo/cosmo/types/common";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

import { getAccessToken } from "@/lib/server/token.server";

const querySchema = z.object({
  artistId: z.enum(validArtists),
});

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
