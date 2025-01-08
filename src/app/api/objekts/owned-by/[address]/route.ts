import { indexer } from "@/lib/server/db/indexer";
import { objekts, collections } from "@/lib/server/db/indexer/schema";
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
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(objekts.owner, params.address.toLowerCase()))
    .orderBy(desc(objekts.receivedAt))
    .limit(PER_PAGE + 1)
    .offset(startAfter);

  const hasNext = results.length > PER_PAGE;
  const nextStartAfter = hasNext ? startAfter + results.length : undefined;

  // temporary solution

  return Response.json({
    hasNext,
    nextStartAfter,
    objekts: results.map((a) => ({
      collectionId: a.collections?.collectionId,
      season: a.collections?.season,
      member: a.collections?.member,
      collectionNo: a.collections?.collectionNo,
      class: a.collections?.class,
      artists: [a.collections?.artist],
      thumbnailImage: a.collections?.thumbnailImage,
      frontImage: a.collections?.frontImage,
      backImage: a.collections?.backImage,
      accentColor: a.collections?.accentColor,
      backgroundColor: a.collections?.backgroundColor,
      textColor: a.collections?.textColor,
      comoAmount: a.collections?.comoAmount,
      objektNo: a.objekts.serial,
      transferable: a.objekts.transferable,
      receivedAt: a.objekts.receivedAt,
      mintedAt: a.objekts.mintedAt,
    })),
  });
}
