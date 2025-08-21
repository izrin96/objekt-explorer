import { and, desc, eq, gt, inArray, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod/v4";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { validArtists } from "@/lib/universal/cosmo/common";
import { overrideCollection } from "@/lib/universal/objekts";

const schema = z.object({
  artist: z.enum(validArtists).array(),
  cursor: z
    .object({
      createdAt: z.string(),
      collectionId: z.string(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);

  const result = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .where(
      and(
        ...(query.artist.length
          ? [
              inArray(
                collections.artist,
                query.artist.map((a) => a.toLowerCase()),
              ),
            ]
          : []),
        ...(query.cursor
          ? [
              or(
                gt(collections.createdAt, query.cursor.createdAt),
                and(
                  eq(collections.createdAt, query.cursor.createdAt),
                  gt(collections.collectionId, query.cursor.collectionId),
                ),
              ),
            ]
          : []),
      ),
    )
    .orderBy(desc(collections.createdAt), desc(collections.collectionId));

  return Response.json(
    {
      collections: result.map((collection) => ({
        ...collection,
        ...overrideCollection(collection),
      })),
    },
    {
      headers: {
        "Cache-Control": `private, max-age=${24 * 60 * 60}`,
      },
    },
  );
}

function parseParams(params: URLSearchParams): z.infer<typeof schema> {
  const result = schema.safeParse({
    artist: params.getAll("artist"),
    cursor: params.get("cursor") ? JSON.parse(params.get("cursor")!) : undefined,
  });

  return result.success
    ? result.data
    : {
        artist: [],
      };
}
