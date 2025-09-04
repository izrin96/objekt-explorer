import crypto from "node:crypto";
import { desc, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { validArtists } from "@/lib/universal/cosmo/common";
import { type CollectionResult, overrideCollection } from "@/lib/universal/objekts";

const schema = z.object({
  artist: z.enum(validArtists).array(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);

  const whereQuery = query.artist.length
    ? inArray(
        collections.artist,
        query.artist.map((a) => a.toLowerCase()),
      )
    : undefined;

  // get single row for etag checking
  const singleResult = await indexer
    .select({
      createdAt: collections.createdAt,
      collectionId: collections.collectionId,
    })
    .from(collections)
    .where(whereQuery)
    .orderBy(desc(collections.createdAt), desc(collections.collectionId))
    .limit(1);

  if (!singleResult.length)
    return Response.json({
      collections: [],
    } satisfies CollectionResult);

  // check for etag
  const etag = `W/"${crypto.createHash("md5").update(JSON.stringify(singleResult[0])).digest("hex")}"`;
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
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
    .orderBy(desc(collections.createdAt), desc(collections.collectionId));

  const body = JSON.stringify({
    collections: result.map((collection) => ({
      ...collection,
      ...overrideCollection(collection),
    })),
  } satisfies CollectionResult);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

function parseParams(params: URLSearchParams): z.infer<typeof schema> {
  const result = schema.safeParse({
    artist: params.getAll("artist"),
  });

  return result.success
    ? result.data
    : {
        artist: [],
      };
}
