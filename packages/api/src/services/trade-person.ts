import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { user, userAddress } from "@repo/db/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { isAddressHandle, tradeHandle, type TradePersonInput } from "../schemas/trade-person";
import { fetchAddresses } from "./trade-matches/holdings";

/** The account a handle (any linked nickname or address, any case) or a user id names. */
async function findUserId(input: TradePersonInput) {
  if (input.handle !== undefined) {
    // both columns are citext, so case never matters
    const column = isAddressHandle(input.handle) ? userAddress.address : userAddress.nickname;
    const [row] = await db
      .select({ userId: userAddress.userId })
      .from(userAddress)
      .where(and(eq(column, input.handle), isNotNull(userAddress.userId)))
      // two profiles can share a nickname: an account's default profile wins, then the newest
      .orderBy(desc(userAddress.isDefault), desc(userAddress.id))
      .limit(1);
    return row?.userId ?? undefined;
  }
  if (input.userId === undefined) return undefined;
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);
  return row?.id;
}

/**
 * The account behind a Trade person page and its canonical handle, so the caller can redirect a
 * handle that isn't it. Only linked profiles resolve; anything else is NOT_FOUND.
 */
export async function resolveTradePerson(input: TradePersonInput) {
  const userId = await findUserId(input);
  if (!userId) throw new ORPCError("NOT_FOUND");
  return { userId, handle: tradeHandle(await fetchAddresses([userId])) };
}
