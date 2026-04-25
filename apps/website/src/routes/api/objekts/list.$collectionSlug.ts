import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { createFileRoute } from "@tanstack/react-router";
import { and, asc, eq, ne } from "drizzle-orm";

import { cacheHeaders } from "@/lib/server/api/common.server";

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
          .where(and(eq(collections.slug, params.collectionSlug), ne(objekts.serial, 0)))
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
