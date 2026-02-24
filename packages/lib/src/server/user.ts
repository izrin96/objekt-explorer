import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

export async function fetchKnownAddresses(addresses: string[]) {
  if (addresses.length === 0) return [];
  const result = await db
    .select({
      address: userAddress.address,
      nickname: userAddress.nickname,
      hideNickname: userAddress.hideNickname,
    })
    .from(userAddress)
    .where(
      inArray(
        userAddress.address,
        addresses.map((a) => a.toLowerCase()),
      ),
    )
    .orderBy(desc(userAddress.id));
  return result;
}

export async function fetchUserProfiles(id: string) {
  const result = await db
    .select({
      address: userAddress.address,
      nickname: userAddress.nickname,
    })
    .from(userAddress)
    .where(eq(userAddress.userId, id))
    .orderBy(desc(userAddress.id));
  return result;
}
