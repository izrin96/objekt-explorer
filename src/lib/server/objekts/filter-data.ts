import { asc } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { collections } from "../db/indexer/schema";
import { getCache } from "../redis";

export async function fetchUniqueCollections() {
  const result = await indexer
    .selectDistinct({
      collectionNo: collections.collectionNo,
    })
    .from(collections)
    .orderBy(asc(collections.collectionNo));
  return result.map((a) => a.collectionNo);
}

export async function fetchFilterData() {
  return getCache("filter-data", 60 * 60, async () => {
    const [collections] = await Promise.all([fetchUniqueCollections()]);
    return {
      collections,
    };
  });
}
