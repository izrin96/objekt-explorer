import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import { cacheHeaders } from "../common";

export async function GET() {
  const [collections] = await Promise.all([fetchUniqueCollections()]);
  return NextResponse.json(
    { collections },
    {
      headers: cacheHeaders(3600),
    },
  );
}

async function fetchUniqueCollections() {
  const result = await indexer
    .selectDistinct({
      collectionNo: collections.collectionNo,
    })
    .from(collections)
    .orderBy(asc(collections.collectionNo));
  return result.map((a) => a.collectionNo);
}
