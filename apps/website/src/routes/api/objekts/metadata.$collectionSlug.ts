import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { createFileRoute } from "@tanstack/react-router";
import { count, eq, sql } from "drizzle-orm";

export const Route = createFileRoute("/api/objekts/metadata/$collectionSlug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const [result] = await indexer
          .select({
            total: count(),
            spin: sql`count(case when ${objekts.owner}=${Addresses.SPIN} then 1 end)`.mapWith(
              Number,
            ),
            transferable:
              sql`count(case when transferable = true and ${objekts.owner}!=${Addresses.SPIN} then 1 end)`.mapWith(
                Number,
              ),
          })
          .from(collections)
          .innerJoin(objekts, eq(collections.id, objekts.collectionId))
          .where(eq(collections.slug, params.collectionSlug));

        return Response.json(result ?? { total: 0, spin: 0, transferable: 0 });
      },
    },
  },
});
