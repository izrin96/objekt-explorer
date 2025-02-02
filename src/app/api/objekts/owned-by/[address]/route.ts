import { indexer } from "@/lib/server/db/indexer";
import { objekts, collections } from "@/lib/server/db/indexer/schema";
import { OwnedObjekt } from "@/lib/universal/objekts";
import { eq, desc, asc } from "drizzle-orm";
import { NextRequest } from "next/server";

type Params = {
  params: Promise<{
    address: string;
  }>;
};

export async function GET(_: NextRequest, props: Params) {
  const params = await props.params;

  const results = await indexer
    .select({
      objekts,
      collections,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(objekts.owner, params.address.toLowerCase()))
    .orderBy(desc(objekts.receivedAt), asc(objekts.id));

  return Response.json({
    objekts: results.map(
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
