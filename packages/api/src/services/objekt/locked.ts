import { db } from "@repo/db";

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
