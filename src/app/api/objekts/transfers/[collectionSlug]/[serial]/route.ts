import { and, desc, eq } from "drizzle-orm";
import { cachedSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts, transfers } from "@/lib/server/db/indexer/schema";
import { fetchUserProfiles } from "@/lib/server/profile";
import type { ObjektTransferResult } from "@/lib/universal/objekts";

type Params = {
  params: Promise<{
    collectionSlug: string;
    serial: string;
  }>;
};

export async function GET(_: Request, props: Params) {
  const params = await props.params;

  const results = await indexer
    .select({
      tokenId: objekts.id,
      id: transfers.id,
      to: transfers.to,
      timestamp: transfers.timestamp,
      owner: objekts.owner,
      transferable: objekts.transferable,
    })
    .from(transfers)
    .leftJoin(objekts, eq(transfers.objektId, objekts.id))
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(eq(collections.slug, params.collectionSlug), eq(objekts.serial, Number(params.serial))),
    )
    .orderBy(desc(transfers.timestamp), desc(transfers.id));

  const [result] = results;

  if (!result)
    return Response.json({
      transfers: [],
    });

  const session = await cachedSession();

  const owner = await db.query.userAddress.findFirst({
    where: (q, { eq }) => eq(q.address, result.owner!),
    columns: {
      privateSerial: true,
    },
  });

  const isPrivate = owner?.privateSerial ?? false;

  if (!session && isPrivate)
    return Response.json({
      hide: true,
      transfers: [],
    });

  if (session && isPrivate) {
    const profiles = await fetchUserProfiles(session.user.id);

    const isProfileAuthed = profiles.some(
      (a) => a.address.toLowerCase() === result.owner!.toLowerCase(),
    );

    if (!isProfileAuthed)
      return Response.json({
        hide: true,
        transfers: [],
      });
  }

  const addresses = Array.from(new Set(results.map((r) => r.to)));

  const knownAddresses = await db.query.userAddress.findMany({
    columns: {
      address: true,
      nickname: true,
    },
    where: (userAddress, { inArray }) => inArray(userAddress.address, addresses),
  });

  return Response.json({
    tokenId: result.tokenId ?? undefined,
    owner: result.owner ?? undefined,
    transferable: result.transferable ?? undefined,
    transfers: results.map((result) => ({
      id: result.id,
      to: result.to,
      timestamp: result.timestamp,
      nickname: knownAddresses.find((a) => a.address.toLowerCase() === result.to.toLowerCase())
        ?.nickname,
    })),
  } satisfies ObjektTransferResult);
}
