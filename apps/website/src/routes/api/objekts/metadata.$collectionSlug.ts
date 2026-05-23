import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { createFileRoute } from "@tanstack/react-router";
import { count, eq, sql } from "drizzle-orm";

export const Route = createFileRoute("/api/objekts/metadata/$collectionSlug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const [collection] = await indexer
          .select({ id: collections.id })
          .from(collections)
          .where(eq(collections.slug, params.collectionSlug))
          .limit(1);

        if (!collection) return Response.json({ total: 0, spin: 0, transferable: 0 });

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
          .from(objekts)
          .where(eq(objekts.collectionId, collection.id));

        return Response.json(result ?? { total: 0, spin: 0, transferable: 0 });
      },
    },
  },
});
