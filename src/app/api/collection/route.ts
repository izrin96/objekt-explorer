import { getCollectionColumns } from "@/lib/server/objekts/objekt-index";
import { cacheHeaders } from "../common";
import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { and, or, eq, lt, gt, desc, asc } from "drizzle-orm";

const cursorSchema = z
  .object({
    createdAt: z.string(),
    collectionId: z.string(),
  })
  .optional();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cursor = cursorSchema.parse(
    searchParams.get("cursor")
      ? JSON.parse(searchParams.get("cursor")!)
      : undefined
  );

  const result = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .where(
      cursor
        ? or(
            gt(collections.createdAt, cursor.createdAt),
            and(
              eq(collections.createdAt, cursor.createdAt),
              lt(collections.collectionId, cursor.collectionId)
            )
          )
        : undefined
    )
    .orderBy(desc(collections.createdAt), asc(collections.collectionId));

  return Response.json(
    {
      collections: result,
    },
    {
      headers: cacheHeaders(),
    }
  );
}
