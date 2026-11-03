import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { userAddress } from "@repo/db/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { unique } from "../../lib/unique";
import {
  handleOwner,
  isAddressHandle,
  tradeHandle,
  type TradePersonInput,
} from "../../schemas/trade-person";
import { fetchAddresses } from "./matches/holdings";

// a nickname is held by a handful of rows at most; this bounds a pathological one
const CANDIDATE_ROWS = 20;

/** The account a handle (any linked nickname or address, any case) names, and its profiles. */
async function findByHandle(handle: string) {
  // both columns are citext, so case never matters
  const column = isAddressHandle(handle) ? userAddress.address : userAddress.nickname;
  const rows = await db
    .select({ userId: userAddress.userId })
    .from(userAddress)
    .where(and(eq(column, handle), isNotNull(userAddress.userId)))
    // the fallback when no candidate's own handle is this one: a default profile, then the newest
    .orderBy(desc(userAddress.isDefault), desc(userAddress.id))
    .limit(CANDIDATE_ROWS);
  const ids = unique(rows.flatMap((row) => (row.userId ? [row.userId] : [])));
  const addresses = await fetchAddresses(ids);
  const candidates = ids.map((userId) => ({
    userId,
    addresses: addresses.filter((row) => row.userId === userId),
  }));
  const userId = handleOwner(handle, candidates);
  return candidates.find((candidate) => candidate.userId === userId);
}

/**
 * The account behind a Trade person page and its canonical handle, so the caller can redirect a
 * handle that isn't it. Only an account with a linked profile resolves; anything else is NOT_FOUND.
 */
export async function resolveTradePerson(input: TradePersonInput) {
  const found =
    input.handle !== undefined
      ? await findByHandle(input.handle)
      : input.userId !== undefined
        ? { userId: input.userId, addresses: await fetchAddresses([input.userId]) }
        : undefined;
  const handle = found ? tradeHandle(found.addresses) : null;
  if (!found || !handle) throw new ORPCError("NOT_FOUND");
  return { userId: found.userId, handle };
}
