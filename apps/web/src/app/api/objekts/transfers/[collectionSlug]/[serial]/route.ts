import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { fetchKnownAddresses, fetchUserProfiles } from "@repo/lib/server/user";
import { and, desc, eq } from "drizzle-orm";

import { getSession } from "@/lib/server/auth";

type Params = {
  params: Promise<{
    collectionSlug: string;
    serial: string;
  }>;
};

export async function GET(_: Request, props: Params) {
  const [session, params] = await Promise.all([getSession(), props.params]);

  const serial = parseInt(params.serial);
  if (Number.isNaN(serial)) {
    return Response.json({ message: "Invalid serial" }, { status: 422 });
  }

  if (serial < 0)
    return Response.json({
      transfers: [],
    });

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
    .where(and(eq(collections.slug, params.collectionSlug), eq(objekts.serial, serial)))
    .orderBy(desc(transfers.id));

  const [result] = results;
  if (!result)
    return Response.json({
      transfers: [],
    });

  const owner = await db.query.userAddress.findFirst({
    where: { address: result.owner! },
    columns: {
      privateSerial: true,
    },
    orderBy: {
      id: "desc",
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

  const knownAddresses = await fetchKnownAddresses(addresses);

  return Response.json({
    tokenId: result.tokenId ?? undefined,
    owner: result.owner ?? undefined,
    transferable: result.transferable ?? undefined,
    transfers: results.map((result) => ({
      id: result.id,
      to: result.to,
      timestamp: new Date(result.timestamp).toISOString(),
      nickname: knownAddresses.find(
        (a) => a.address.toLowerCase() === result.to.toLowerCase() && !a.hideNickname,
      )?.nickname,
    })),
  });
}
