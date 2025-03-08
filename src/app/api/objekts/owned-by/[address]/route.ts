import { indexer } from "@/lib/server/db/indexer";
import { objekts, collections } from "@/lib/server/db/indexer/schema";
import { OwnedObjekt } from "@/lib/universal/objekts";
import { eq, desc, asc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

type Params = {
  params: Promise<{
    address: string;
  }>;
};

const PER_PAGE = 10000;

export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;

  const searchParams = request.nextUrl.searchParams;

  const pageSchema = z.coerce.number().optional().default(0);

  const page = pageSchema.parse(searchParams.get("page"));

  const results = await indexer
    .select({
      objekts,
      collections,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(objekts.owner, params.address.toLowerCase()))
    .orderBy(desc(objekts.receivedAt), asc(objekts.id))
    .limit(PER_PAGE + 1)
    .offset(page * PER_PAGE);

  const hasNext = results.length > PER_PAGE;
  const nextStartAfter = hasNext ? page + 1 : undefined;

  return Response.json({
    hasNext,
    nextStartAfter,
    objekts: results.slice(0, PER_PAGE).map(
      (a) =>
        ({
          ...a.collections,
          id: a.objekts.id,
          serial: a.objekts.serial,
          receivedAt: a.objekts.receivedAt,
          mintedAt: a.objekts.mintedAt,
          transferable: a.objekts.transferable,
        } satisfies OwnedObjekt)
    ),
  });
}
