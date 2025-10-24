import { createFileRoute } from "@tanstack/react-router";
import { asc, eq } from "drizzle-orm";
import { cacheHeaders } from "@/lib/server/common";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";

export const Route = createFileRoute("/api/objekts/list/$collectionSlug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const results = await indexer
          .select({
            serial: objekts.serial,
          })
          .from(objekts)
          .leftJoin(collections, eq(objekts.collectionId, collections.id))
          .where(eq(collections.slug, params.collectionSlug))
          .orderBy(asc(objekts.serial));

        return Response.json(
          {
            serials: results.map((a) => a.serial),
          },
          {
            headers: cacheHeaders(60),
          },
        );
      },
    },
  },
});
