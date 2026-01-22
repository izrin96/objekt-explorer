import { and, desc, inArray, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import * as z from "zod/v4";

import type { CollectionResult } from "@/lib/universal/objekts";

import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { overrideCollection } from "@/lib/server/objekt";
import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { validArtists } from "@/lib/universal/cosmo/common";

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
  const etag = `W/"${createHash("md5").update(singleResult[0].id).digest("hex")}"`;
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
    collections: result.map(overrideCollection),
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
