import { fetchSerialTransfers } from "@repo/api/services/collection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/objekts/transfers/$collectionSlug/$serial")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const serial = parseInt(params.serial);
        if (Number.isNaN(serial)) {
          return Response.json({ message: "Invalid serial" }, { status: 422 });
        }

        return Response.json(await fetchSerialTransfers(params.collectionSlug, serial));
      },
    },
  },
});
