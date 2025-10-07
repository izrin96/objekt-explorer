import crypto from "node:crypto";
import { and, desc, inArray, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as z from "zod/v4";
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

  const whereQuery = and(
    ...(query.artist.length
      ? [
          inArray(
            collections.artist,
            query.artist.map((a) => a.toLowerCase()),
          ),
        ]
      : []),
    ne(collections.slug, "empty-collection"),
  );

  const singleResult = await indexer
    .select({
      id: collections.id,
    })
    .from(collections)
    .where(whereQuery)
    .orderBy(desc(collections.id))
    .limit(1);

  if (!singleResult.length)
    return Response.json({
      collections: [],
    } satisfies CollectionResult);

  // check for etag
  const etag = `W/"${crypto.createHash("md5").update(singleResult[0].id).digest("hex")}"`;
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
    .orderBy(desc(collections.id));

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
