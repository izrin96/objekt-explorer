import { db } from "@repo/db";
import { user, userAddress } from "@repo/db/schema";
import { asc, inArray, sql } from "drizzle-orm";

import { chatIdentity } from "../lib/chat-rules";
import type { LinkedProfile, PartnerIdentity } from "../lib/trade-rank";

/**
 * How each account is named to the people it chats and trades with. Shared by the API and
 * the worker, so it imports nothing request-bound.
 */
export async function loadIdentities(userIds: string[]) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0)
    return new Map<string, { account: typeof user.$inferSelect; identity: PartnerIdentity }>();
  const [users, addresses] = await Promise.all([
    db.select().from(user).where(inArray(user.id, ids)),
    db
      .select({
        userId: userAddress.userId,
        address: userAddress.address,
        nickname: userAddress.nickname,
        isDefault: userAddress.isDefault,
        privateProfile: userAddress.privateProfile,
      })
      .from(userAddress)
      .where(inArray(userAddress.userId, ids))
      // a re-link keeps its old row, so the row id is not link order
      .orderBy(sql`${userAddress.linkedAt} ASC NULLS LAST`, asc(userAddress.id)),
  ]);

  const addressesOf = new Map<string, LinkedProfile[]>();
  for (const { userId, ...profile } of addresses) {
    if (userId) addressesOf.set(userId, [...(addressesOf.get(userId) ?? []), profile]);
  }
  return new Map(
    users.map((account) => [
      account.id,
      { account, identity: chatIdentity(account.name, addressesOf.get(account.id) ?? []) },
    ]),
  );
}
