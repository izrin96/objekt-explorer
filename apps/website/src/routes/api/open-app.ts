import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

import { artistSchema } from "@/lib/universal/artist";

const openAppSchema = z.object({
  artist: artistSchema,
  to: z.string().min(1).max(128),
});

export const Route = createFileRoute("/api/open-app")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = openAppSchema.safeParse({
          artist: url.searchParams.get("artist") ?? "",
          to: url.searchParams.get("to") ?? "",
        });

        if (!parsed.success) {
          return Response.json({ error: "Invalid parameters" }, { status: 400 });
        }

        const { artist, to } = parsed.data;
        const target = `cosmo://${artist}/${encodeURIComponent(to)}`;
        return Response.redirect(target, 302);
      },
    },
  },
});
