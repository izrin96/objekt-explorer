import { db } from "@repo/db";
import { messagePref, user, userAddress } from "@repo/db/schema";
import { asc, eq, inArray, sql } from "drizzle-orm";

import { chatIdentity } from "../lib/chat-rules";
import type { AddressRef, PartnerIdentity } from "../lib/trade-rank";

/**
 * How each account is named to the people it chats and trades with. Shared by the API and
 * the worker, so it imports nothing request-bound.
 */
export async function loadIdentities(userIds: string[]) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0)
    return new Map<string, { account: typeof user.$inferSelect; identity: PartnerIdentity }>();
  const [users, addresses] = await Promise.all([
    db
      .select({ account: user, chatAs: messagePref.chatAs })
      .from(user)
      .leftJoin(messagePref, eq(messagePref.userId, user.id))
      .where(inArray(user.id, ids)),
    db
      .select({
        userId: userAddress.userId,
        address: userAddress.address,
        nickname: userAddress.nickname,
      })
      .from(userAddress)
      .where(inArray(userAddress.userId, ids))
      // a re-link keeps its old row, so the row id is not link order
      .orderBy(sql`${userAddress.linkedAt} ASC NULLS LAST`, asc(userAddress.id)),
  ]);

  const addressesOf = new Map<string, AddressRef[]>();
  for (const { userId, address, nickname } of addresses) {
    if (userId)
      addressesOf.set(userId, [...(addressesOf.get(userId) ?? []), { address, nickname }]);
  }
  return new Map(
    users.map(({ account, chatAs }) => [
      account.id,
      { account, identity: chatIdentity(account.name, addressesOf.get(account.id) ?? [], chatAs) },
    ]),
  );
}
