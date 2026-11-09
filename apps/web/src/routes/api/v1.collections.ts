import { createFileRoute } from "@tanstack/react-router";

import { cachedCollectionList } from "@/lib/server/collection-list-cache";
import { handleOpenApi } from "@/lib/server/open-api";

export const Route = createFileRoute("/api/v1/collections")({
  server: {
    handlers: {
      ANY: ({ request }) => cachedCollectionList(request, () => handleOpenApi(request)),
    },
  },
});
