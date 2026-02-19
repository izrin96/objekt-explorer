import { createHash } from "node:crypto";

import { validArtists } from "@repo/cosmo/types/common";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { overrideCollection } from "@repo/lib/server/objekt";
import { isValid, parseISO } from "date-fns";
import { and, desc, inArray, lte, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { getCollectionColumns } from "@/lib/server/objekt";

const schema = z.object({
  artist: z.enum(validArtists).array(),
  at: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = parseParams(searchParams);

  // checkpoint: validate and parse the target date
  let targetTimestamp: Date | undefined;
  if (query.at) {
    targetTimestamp = parseISO(query.at);
    if (!isValid(targetTimestamp))
      return Response.json({
        collections: [],
      });
  }

  const whereQuery = and(
    ...(query.artist.length
      ? [
          inArray(
            collections.artist,
            query.artist.map((a) => a.toLowerCase()),
          ),
        ]
      : []),
    ...(targetTimestamp ? [lte(collections.createdAt, targetTimestamp)] : []),
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
  });

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
    at: params.get("at") ?? undefined,
  });

  return result.success
    ? result.data
    : {
        artist: [],
      };
}
