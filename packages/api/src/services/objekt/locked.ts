import { db } from "@repo/db";
import { lockedObjekts } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import { and, eq, inArray } from "drizzle-orm";

import { TOKEN_CHUNK_SIZE } from "../../constants";

export async function fetchLockedObjekts(address: string) {
  const result = await db.query.lockedObjekts.findMany({
    columns: {
      tokenId: true,
    },
    where: { address },
    orderBy: { id: "asc" },
  });
  return result.map((a) => ({
    tokenId: a.tokenId.toString(),
  }));
}

/** Locks `tokenIds`, already checked as held by the address. */
export async function lockTokens(address: string, tokenIds: number[]) {
  await db.transaction(async (tx) => {
    await chunk(tokenIds, TOKEN_CHUNK_SIZE, async (batch) => {
      await tx
        .delete(lockedObjekts)
        .where(and(inArray(lockedObjekts.tokenId, batch), eq(lockedObjekts.address, address)));

      await tx
        .insert(lockedObjekts)
        .values(
          batch.map((tokenId) => ({
            address,
            tokenId,
          })),
        )
        .onConflictDoNothing();
    });
  });
}

export async function unlockTokens(address: string, tokenIds: number[]) {
  await db
    .delete(lockedObjekts)
    .where(and(inArray(lockedObjekts.tokenId, tokenIds), eq(lockedObjekts.address, address)));
}
