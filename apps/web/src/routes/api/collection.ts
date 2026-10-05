import { artistsArraySchema } from "@repo/api/schemas/artist";
import { checkpointSchema } from "@repo/api/schemas/checkpoint";
import { fetchCollectionList } from "@repo/api/services/collection";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const collectionSchema = z.object({
  artist: artistsArraySchema.default([]),
  at: checkpointSchema.optional(),
});

export const Route = createFileRoute("/api/collection")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = collectionSchema.safeParse({
          artist: url.searchParams.getAll("artist"),
          at: url.searchParams.get("at") ?? undefined,
        });
        if (!parsed.success) {
          return Response.json({ error: "Invalid query parameters" }, { status: 400 });
        }

        const ifModifiedSince = request.headers.get("if-modified-since");
        const ifModifiedSinceMs = ifModifiedSince ? new Date(ifModifiedSince).getTime() : 0;

        const list = await fetchCollectionList(parsed.data, ifModifiedSinceMs);
        const lastModified = new Date(list.lastModifiedMs).toUTCString();

        if (list.notModified) {
          return new Response(null, { status: 304, headers: { "Last-Modified": lastModified } });
        }

        return Response.json(list.result, {
          headers: {
            ...(list.lastModifiedMs > 0 ? { "Last-Modified": lastModified } : {}),
            "Cache-Control": "private, max-age=0, must-revalidate",
          },
        });
      },
    },
  },
});
