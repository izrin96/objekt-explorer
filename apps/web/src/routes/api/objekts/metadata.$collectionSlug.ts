import { fetchCollectionMetadata } from "@repo/api/services/collection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/objekts/metadata/$collectionSlug")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        Response.json(await fetchCollectionMetadata(params.collectionSlug)),
    },
  },
});
