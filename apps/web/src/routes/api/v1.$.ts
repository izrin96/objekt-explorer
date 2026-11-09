import { createFileRoute } from "@tanstack/react-router";

import { handleOpenApi } from "@/lib/server/open-api";

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      ANY: ({ request }) => handleOpenApi(request),
    },
  },
});
