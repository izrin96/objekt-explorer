import { validArtists } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import { createFileRoute } from "@tanstack/react-router";
import { and, desc, inArray, lte, ne } from "drizzle-orm";
import * as z from "zod";

import { getCollectionColumns } from "@/lib/server/objekt.server";
import { redis } from "@/lib/server/redis.server";

const collectionSchema = z.object({
  artist: z.enum(validArtists).array(),
  at: z.string().optional(),
});

function parseParams(params: URLSearchParams): z.infer<typeof collectionSchema> {
  const result = collectionSchema.safeParse({
    artist: params.getAll("artist"),
    at: params.get("at") ?? undefined,
  });

  return result.success
    ? result.data
    : {
        artist: [],
      };
}

export const Route = createFileRoute("/api/collection")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = parseParams(url.searchParams);

        const whereQuery = and(
          ...(query.artist.length
            ? [
                inArray(
                  collections.artist,
                  query.artist.map((a) => a.toLowerCase()),
                ),
              ]
            : []),
          ...(query.at ? [lte(collections.createdAt, query.at)] : []),
          ne(collections.slug, "empty-collection"),
        );

        const ifModifiedSince = request.headers.get("if-modified-since");
        const ifModifiedSinceMs = ifModifiedSince ? new Date(ifModifiedSince).getTime() : 0;

        const overrideStr = await redis.get("collection:modified-at");
        const overrideMs = overrideStr ? new Date(overrideStr).getTime() : 0;

        if (ifModifiedSinceMs > 0) {
          const [singleResult] = await indexer
            .select({
              createdAt: collections.createdAt,
            })
            .from(collections)
            .where(whereQuery)
            .orderBy(desc(collections.id))
            .limit(1);

          if (!singleResult)
            return Response.json({
              collections: [],
            });

          const createdAtMs = new Date(singleResult.createdAt).getTime();
          const lastModifiedMs = Math.max(createdAtMs, overrideMs);

          if (ifModifiedSinceMs >= lastModifiedMs) {
            return new Response(null, {
              status: 304,
              headers: {
                "Last-Modified": new Date(lastModifiedMs).toUTCString(),
              },
            });
          }
        }

        const result = await indexer
          .select({
            ...getCollectionColumns(),
          })
          .from(collections)
          .where(whereQuery)
          .orderBy(desc(collections.id));

        const body = JSON.stringify({
          collections: result.map(overrideCollection),
        });

        const lastModifiedMs =
          result.length > 0 ? Math.max(new Date(result[0]!.createdAt).getTime(), overrideMs) : 0;

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...(lastModifiedMs > 0
              ? { "Last-Modified": new Date(lastModifiedMs).toUTCString() }
              : {}),
            "Cache-Control": "private, max-age=0, must-revalidate",
          },
        });
      },
    },
  },
});
