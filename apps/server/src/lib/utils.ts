import { db } from "@objekt-explorer/db";
import { userAddress } from "@objekt-explorer/db/schema";
import { inArray } from "drizzle-orm";

export async function fetchKnownAddresses(addresses: string[]) {
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
    );
  return result;
}
