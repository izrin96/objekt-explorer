import { asc, count, desc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";
import { overrideColor } from "@/lib/utils";

export async function fetchObjektsIndex() {
  const result = await indexer
    .select()
    .from(collections)
    .orderBy(desc(collections.createdAt), asc(collections.collectionId));

  return result.map((objekt) => ({
    ...objekt,
    ...overrideColor(objekt),
  }));
}

export async function fetchObjektsIndexCount() {
  const result = await indexer
    .select({
      count: count(),
    })
    .from(collections);

  return result[0].count;
}
