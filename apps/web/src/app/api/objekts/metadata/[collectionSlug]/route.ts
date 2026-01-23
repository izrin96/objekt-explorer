import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { count, eq, sql } from "drizzle-orm";

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
      spin: sql`count(case when ${objekts.owner}=${Addresses.SPIN} then 1 end)`.mapWith(Number),
      transferable:
        sql`count(case when transferable = true and ${objekts.owner}!=${Addresses.SPIN} then 1 end)`.mapWith(
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
        createdAt: new Date(0),
      },
      {
        headers: cacheHeaders(),
      },
    );

  return Response.json(results[0], {
    headers: cacheHeaders(),
  });
}
