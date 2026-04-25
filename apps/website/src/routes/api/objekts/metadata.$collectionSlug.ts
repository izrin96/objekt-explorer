import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { createFileRoute } from "@tanstack/react-router";
import { count, eq, sql } from "drizzle-orm";

export const Route = createFileRoute("/api/objekts/metadata/$collectionSlug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const results = await indexer
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
          .leftJoin(objekts, eq(collections.id, objekts.collectionId))
          .where(eq(collections.slug, params.collectionSlug))
          .groupBy(collections.id);

        if (!results.length)
          return Response.json({
            total: 0,
            spin: 0,
            transferable: 0,
          });

        return Response.json(results[0]);
      },
    },
  },
});
