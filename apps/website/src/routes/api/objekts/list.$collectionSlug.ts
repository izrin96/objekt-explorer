import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { createFileRoute } from "@tanstack/react-router";
import { and, asc, eq, ne } from "drizzle-orm";

export const Route = createFileRoute("/api/objekts/list/$collectionSlug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const [collection] = await indexer
          .select({ id: collections.id })
          .from(collections)
          .where(eq(collections.slug, params.collectionSlug))
          .limit(1);

        if (!collection) return Response.json({ serials: [] });

        const results = await indexer
          .select({ serial: objekts.serial })
          .from(objekts)
          .where(and(eq(objekts.collectionId, collection.id), ne(objekts.serial, 0)))
          .orderBy(asc(objekts.serial));

        return Response.json({
          serials: results.map((a) => a.serial),
        });
      },
    },
  },
});
