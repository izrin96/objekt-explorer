import { asc, desc, getTableColumns } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";
import { overrideColor } from "@/lib/universal/objekts";

export function getCollectionColumns() {
  const { contract, comoAmount, accentColor, thumbnailImage, ...rest } =
    getTableColumns(collections);
  return rest;
}

export async function fetchObjektsIndex() {
  const result = await indexer
    .select({
      ...getCollectionColumns(),
    })
    .from(collections)
    .orderBy(desc(collections.createdAt), asc(collections.collectionId));

  return result.map((collection) => ({
    ...collection,
    ...overrideColor(collection),
  }));
}
