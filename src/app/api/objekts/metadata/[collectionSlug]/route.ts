import { count, eq, sql } from "drizzle-orm";
import { cacheHeaders } from "@/app/api/common";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { SPIN_ADDRESS } from "@/lib/utils";

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
      spin: sql`count(case when ${objekts.owner}=${SPIN_ADDRESS} then 1 end)`.mapWith(Number),
      transferable:
        sql`count(case when transferable = true and ${objekts.owner}!=${SPIN_ADDRESS} then 1 end)`.mapWith(
          Number,
        ),
      createdAt: collections.createdAt,
    })
    .from(collections)
    .leftJoin(objekts, eq(collections.id, objekts.collectionId))
    .where(eq(collections.slug, params.collectionSlug))
    .groupBy(collections.id);

  if (!results.length)
    return Response.json(
      {
        total: 0,
        spin: 0,
        transferable: 0,
      },
      {
        headers: cacheHeaders(),
      },
    );

  const [result] = results;

  return Response.json(result, {
    headers: cacheHeaders(),
  });
}
