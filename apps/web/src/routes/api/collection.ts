import { artistsArraySchema } from "@repo/api/schemas/artist";
import { getCollectionColumns } from "@repo/api/services/objekt";
import { redis } from "@repo/api/services/redis";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import { createFileRoute } from "@tanstack/react-router";
import { and, desc, inArray, lte, ne } from "drizzle-orm";
import * as z from "zod";

const collectionSchema = z.object({
  artist: artistsArraySchema.default([]),
  at: z.string().optional(),
});

function parseParams(
  params: URLSearchParams,
): { ok: true; data: z.infer<typeof collectionSchema> } | { ok: false; response: Response } {
  const result = collectionSchema.safeParse({
    artist: params.getAll("artist"),
    at: params.get("at") ?? undefined,
  });

  if (!result.success) {
    return {
      ok: false,
      response: Response.json({ error: "Invalid query parameters" }, { status: 400 }),
    };
  }

  return { ok: true, data: result.data };
}

export const Route = createFileRoute("/api/collection")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = parseParams(url.searchParams);
        if (!parsed.ok) return parsed.response;
        const query = parsed.data;

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

        const overridePromise = redis.get("collection:modified-at");

        if (ifModifiedSinceMs > 0) {
          const [overrideStr, [singleResult]] = await Promise.all([
            overridePromise,
            indexer
              .select({
                createdAt: collections.createdAt,
              })
              .from(collections)
              .where(whereQuery)
              .orderBy(desc(collections.id))
              .limit(1),
          ]);

          const overrideMs = overrideStr ? new Date(overrideStr).getTime() : 0;

          if (!singleResult)
            return Response.json({
              collections: [],
            });

          const createdAtMs = new Date(singleResult.createdAt).getTime();
          const lastModifiedMs = Math.floor(Math.max(createdAtMs, overrideMs) / 1000) * 1000;

          if (ifModifiedSinceMs >= lastModifiedMs) {
            return new Response(null, {
              status: 304,
              headers: {
                "Last-Modified": new Date(lastModifiedMs).toUTCString(),
              },
            });
          }
        }

        const [overrideStr, result] = await Promise.all([
          overridePromise,
          indexer
            .select({
              ...getCollectionColumns(),
            })
            .from(collections)
            .where(whereQuery)
            .orderBy(desc(collections.id)),
        ]);

        const overrideMs = overrideStr ? new Date(overrideStr).getTime() : 0;

        const body = JSON.stringify({
          collections: result.map(overrideCollection),
        });

        const lastModifiedMs =
          result.length > 0
            ? Math.floor(Math.max(new Date(result[0]!.createdAt).getTime(), overrideMs) / 1000) *
              1000
            : 0;

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
