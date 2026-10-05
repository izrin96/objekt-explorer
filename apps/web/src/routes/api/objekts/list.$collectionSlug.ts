import { fetchSerialList } from "@repo/api/services/collection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/objekts/list/$collectionSlug")({
  server: {
    handlers: {
      GET: async ({ params }) => Response.json(await fetchSerialList(params.collectionSlug)),
    },
  },
});
