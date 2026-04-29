import { createHash } from "node:crypto";

import { validArtists } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import { createFileRoute } from "@tanstack/react-router";
import { and, desc, inArray, lte, ne } from "drizzle-orm";
import * as z from "zod";

import { getCollectionColumns } from "@/lib/server/objekt.server";

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

        const [singleResult] = await indexer
          .select({
            id: collections.id,
          })
          .from(collections)
          .where(whereQuery)
          .orderBy(desc(collections.id))
          .limit(1);

        if (!singleResult)
          return Response.json({
            collections: [],
          });

        // check for etag
        const etag = `W/"${createHash("md5").update(singleResult.id).digest("hex")}"`;
        const ifNoneMatch = request.headers.get("if-none-match");
        if (ifNoneMatch === etag) {
          return new Response(null, {
            status: 304,
            headers: {
              ETag: etag,
            },
          });
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

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ETag: etag,
            "Cache-Control": "private, max-age=0, must-revalidate",
          },
        });
      },
    },
  },
});
