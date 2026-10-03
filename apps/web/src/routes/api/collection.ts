import { artistsArraySchema } from "@repo/api/schemas/artist";
import { checkpointSchema } from "@repo/api/schemas/checkpoint";
import type { CollectionResult } from "@repo/api/schemas/objekt";
import { getCollectionColumns } from "@repo/api/services/objekt";
import { redis } from "@repo/api/services/redis";
import { toIndexedArtist } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import { createFileRoute } from "@tanstack/react-router";
import { and, desc, inArray, lte, ne, type SQL } from "drizzle-orm";
import * as z from "zod";

const collectionSchema = z.object({
  artist: artistsArraySchema.default([]),
  at: checkpointSchema.optional(),
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

const emptyBody = JSON.stringify({ collections: [] } satisfies CollectionResult);

// Nearly every request is the unfiltered list, so it is built once and reused
// until Last-Modified moves past it. The TTL picks up in-place edits that don't
// move it, such as indexer upserts.
const FULL_LIST_TTL_MS = 5 * 60 * 1000;
let fullListCache: { lastModifiedMs: number; expiresAt: number; body: Promise<string> } | undefined;

function getFullListBody(whereQuery: SQL | undefined, lastModifiedMs: number) {
  if (
    !fullListCache ||
    fullListCache.lastModifiedMs < lastModifiedMs ||
    fullListCache.expiresAt <= Date.now()
  ) {
    const body = fetchCollectionsBody(whereQuery);
    fullListCache = { lastModifiedMs, expiresAt: Date.now() + FULL_LIST_TTL_MS, body };
    void body.catch(() => {
      if (fullListCache?.body === body) fullListCache = undefined;
    });
  }
  return fullListCache.body;
}

async function fetchCollectionsBody(whereQuery: SQL | undefined) {
  const result = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .where(whereQuery)
    .orderBy(desc(collections.id));

  return JSON.stringify({
    collections: result.map(overrideCollection),
  } satisfies CollectionResult);
}

function collectionResponse(body: string, lastModifiedMs: number) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...(lastModifiedMs > 0 ? { "Last-Modified": new Date(lastModifiedMs).toUTCString() } : {}),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

export const Route = createFileRoute("/api/collection")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = parseParams(url.searchParams);
        if (!parsed.ok) return parsed.response;
        const query = parsed.data;

        const filters = [
          ...(query.artist.length
            ? [inArray(collections.artist, query.artist.map(toIndexedArtist))]
            : []),
          ...(query.at ? [lte(collections.createdAt, query.at)] : []),
        ];
        const whereQuery = and(...filters, ne(collections.slug, "empty-collection"));

        const ifModifiedSince = request.headers.get("if-modified-since");
        const ifModifiedSinceMs = ifModifiedSince ? new Date(ifModifiedSince).getTime() : 0;

        const [overrideStr, [latest]] = await Promise.all([
          redis.get("collection:modified-at"),
          indexer
            .select({
              createdAt: collections.createdAt,
            })
            .from(collections)
            .where(whereQuery)
            .orderBy(desc(collections.id))
            .limit(1),
        ]);

        if (!latest) return collectionResponse(emptyBody, 0);

        const overrideMs = overrideStr ? new Date(overrideStr).getTime() : 0;
        const createdAtMs = new Date(latest.createdAt).getTime();
        const lastModifiedMs = Math.floor(Math.max(createdAtMs, overrideMs) / 1000) * 1000;

        if (ifModifiedSinceMs > 0 && ifModifiedSinceMs >= lastModifiedMs) {
          return new Response(null, {
            status: 304,
            headers: {
              "Last-Modified": new Date(lastModifiedMs).toUTCString(),
            },
          });
        }

        const body =
          filters.length === 0
            ? await getFullListBody(whereQuery, lastModifiedMs)
            : await fetchCollectionsBody(whereQuery);

        return collectionResponse(body, lastModifiedMs);
      },
    },
  },
});
