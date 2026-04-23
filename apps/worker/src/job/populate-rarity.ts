import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { count, eq, ne } from "drizzle-orm";

import { redis } from "@/lib/redis";

export async function populateRarity() {
  const results = await indexer
    .select({
      slug: collections.slug,
      count: count(),
    })
    .from(collections)
    .leftJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(ne(collections.slug, "empty-collection"))
    .groupBy(collections.slug);

  await redis.set("collection-rarity", JSON.stringify(results), "EX", 2 * 60 * 60);
}
