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

  if (!results.length)
    return Response.json(
      {
        total: 0,
        transferable: false,
      },
      {
        headers: cacheHeaders(),
      }
    );

  const [result] = results;

  return Response.json(result, {
    headers: cacheHeaders(),
  });
}
