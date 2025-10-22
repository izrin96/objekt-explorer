import { createFileRoute } from "@tanstack/react-router";
import { count, eq, sql } from "drizzle-orm";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import type { CollectionMetadata } from "@/lib/universal/objekts";
import { cacheHeaders, SPIN_ADDRESS } from "@/lib/utils";

export const Route = createFileRoute("/api/objekts/metadata/$collectionSlug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const results = await indexer
          .select({
            total: count(),
            spin: sql`count(case when ${objekts.owner}=${SPIN_ADDRESS} then 1 end)`.mapWith(Number),
            transferable:
              sql`count(case when transferable = true and ${objekts.owner}!=${SPIN_ADDRESS} then 1 end)`.mapWith(
                Number,
              ),
            createdAt: collections.createdAt,
          })
          .from(collections)
          .leftJoin(objekts, eq(collections.id, objekts.collectionId))
          .where(eq(collections.slug, params.collectionSlug))
          .groupBy(collections.id);

        if (!results.length)
          return Response.json(
            {
              total: 0,
              spin: 0,
              transferable: 0,
              createdAt: new Date(0).toISOString(),
            } satisfies CollectionMetadata,
            {
              headers: cacheHeaders(),
            },
          );

        return Response.json(results[0], {
          headers: cacheHeaders(),
        });
      },
    },
  },
});
