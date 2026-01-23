import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
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

export async function fetchUserProfiles(id: string) {
  const result = await db.query.userAddress.findMany({
    columns: {
      address: true,
      nickname: true,
    },
    where: (t, { eq }) => eq(t.userId, id),
  });
  return result;
}
