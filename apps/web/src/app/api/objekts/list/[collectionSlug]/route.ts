import { asc, eq } from "drizzle-orm";
import { cacheHeaders } from "@/app/api/common";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";

type Params = {
  params: Promise<{
    collectionSlug: string;
  }>;
};

export async function GET(_: Request, props: Params) {
  const params = await props.params;

  const results = await indexer
    .select({
      serial: objekts.serial,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(collections.slug, params.collectionSlug))
    .orderBy(asc(objekts.serial));

  return Response.json(
    {
      serials: results.map((a) => a.serial),
    },
    {
      headers: cacheHeaders(60),
    },
  );
}
