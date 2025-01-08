import { indexer } from "@/lib/server/db/indexer";
import { objekts, collections } from "@/lib/server/db/indexer/schema";
import { OwnedObjekt } from "@/lib/universal/objekts";
import { eq, desc } from "drizzle-orm";
import { NextRequest } from "next/server";

type Params = {
  params: Promise<{
    address: string;
  }>;
};

const PER_PAGE = 150;

export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  const startAfter = parseInt(
    request.nextUrl.searchParams.get("start_after") ?? "0"
  );

  const results = await indexer
    .select({
      objekts,
      collections,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(objekts.owner, params.address.toLowerCase()))
    .orderBy(desc(objekts.receivedAt))
    .limit(PER_PAGE + 1)
    .offset(startAfter);

  const hasNext = results.length > PER_PAGE;
  const nextStartAfter = hasNext ? startAfter + PER_PAGE : undefined;

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
        } satisfies OwnedObjekt)
    ),
  });
}
