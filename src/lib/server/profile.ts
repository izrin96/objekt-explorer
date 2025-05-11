import { inArray } from "drizzle-orm";
import { db } from "./db";
import { userAddress } from "./db/schema";

export async function fetchKnownAddresses(addresses: string[]) {
  const result = await db
    .select({ address: userAddress.address, nickname: userAddress.nickname })
    .from(userAddress)
    .where(
      inArray(
        userAddress.address,
        addresses.map((a) => a.toLowerCase())
      )
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
