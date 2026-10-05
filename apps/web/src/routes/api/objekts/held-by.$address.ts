import { ownedByFiltersSchema } from "@repo/api/schemas/objekts";
import { fetchHeldObjekts } from "@repo/api/services/owned";
import { createFileRoute } from "@tanstack/react-router";

const heldBySchema = ownedByFiltersSchema.pick({ artist: true });

export const Route = createFileRoute("/api/objekts/held-by/$address")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const parsed = heldBySchema.safeParse({
          artist: url.searchParams.getAll("artist").length
            ? url.searchParams.getAll("artist")
            : undefined,
        });
        if (!parsed.success) {
          return Response.json({ error: "Invalid query parameters" }, { status: 400 });
        }

        return Response.json(await fetchHeldObjekts(params.address, parsed.data.artist));
      },
    },
  },
});
