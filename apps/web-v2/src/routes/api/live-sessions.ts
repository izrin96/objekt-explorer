import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { fetchLiveSessions } from "@/lib/server/cosmo/live";
import { getAccessToken } from "@/lib/server/token";

const querySchema = z.object({
  artistId: z.string(),
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
