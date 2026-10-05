import { db } from "@repo/db";

import { isAddressHiddenFromCaller } from "./privacy";

export async function fetchLockedObjekts(address: string) {
  if (await isAddressHiddenFromCaller(address)) return [];
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
