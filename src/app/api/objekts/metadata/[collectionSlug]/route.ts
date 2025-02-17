import { indexer } from "@/lib/server/db/indexer";
import { count, eq, sql } from "drizzle-orm";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { cacheHeaders } from "@/app/api/common";

type Params = {
  params: Promise<{
    collectionSlug: string;
  }>;
};

export async function GET(_: Request, props: Params) {
  const params = await props.params;

  const results = await indexer
    .select({
      total: count(),
      transferable:
        sql`count(case when transferable = true then 1 end)`.mapWith(Number),
    })
    .from(collections)
    .leftJoin(objekts, eq(collections.id, objekts.collectionId))
    .where(eq(collections.slug, params.collectionSlug))
    .groupBy(collections.id);
  const collection = results[0];

  return Response.json(collection, {
    headers: cacheHeaders(),
  });
}
