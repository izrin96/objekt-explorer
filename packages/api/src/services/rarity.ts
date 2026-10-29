import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { count, eq } from "drizzle-orm";

import { getCache } from "./redis";

export async function fetchCollectionRarity() {
  return getCache("collection-rarity", 2 * 60 * 60, async () => {
    const results = await indexer
      .select({
        slug: collections.slug,
        count: count(),
      })
      .from(collections)
      .leftJoin(objekts, eq(objekts.collectionId, collections.id))
      .groupBy(collections.slug);

    return results;
  });
}
