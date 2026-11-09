import { db } from "@repo/db";
import { hiddenTradePartner, lists, user, userAddress } from "@repo/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

import { bumpTradeVersions } from "../moderation/safety-cache";
import { toPublicUser } from "../profile";

/** A no-op unless the partner has a list For you or Browse can show (see `trade.hidePartner`). */
export async function hidePartner(viewerId: string, userId: string) {
  const tradeLists = await db.$count(
    lists,
    and(
      eq(lists.userId, userId),
      eq(lists.discoverable, true),
      inArray(lists.listType, ["have", "sale", "want"]),
    ),
  );
  if (tradeLists === 0) return;

  await db
    .insert(hiddenTradePartner)
    .values({ userId: viewerId, hiddenUserId: userId })
    .onConflictDoNothing();
  await bumpTradeVersions([viewerId]);
}

export async function unhidePartner(viewerId: string, userId: string) {
  await db
    .delete(hiddenTradePartner)
    .where(
      and(eq(hiddenTradePartner.userId, viewerId), eq(hiddenTradePartner.hiddenUserId, userId)),
    );
  await bumpTradeVersions([viewerId]);
}

/** The partners the viewer hid, newest first, each with the profiles For you named them by. */
export async function fetchHiddenPartners(viewerId: string) {
  const rows = await db
    .select({ user, hiddenAt: hiddenTradePartner.createdAt })
    .from(hiddenTradePartner)
    .innerJoin(user, eq(user.id, hiddenTradePartner.hiddenUserId))
    .where(eq(hiddenTradePartner.userId, viewerId))
    .orderBy(desc(hiddenTradePartner.createdAt));

  // only addresses a discoverable list is bound to, as For you named the partner
  const addresses =
    rows.length === 0
      ? []
      : await db
          .selectDistinct({
            userId: lists.userId,
            address: userAddress.address,
            nickname: userAddress.nickname,
          })
          .from(lists)
          .innerJoin(userAddress, eq(userAddress.address, lists.profileAddress))
          .where(
            and(
              inArray(
                lists.userId,
                rows.map((row) => row.user.id),
              ),
              eq(lists.discoverable, true),
              inArray(lists.listType, ["have", "sale", "want"]),
              eq(userAddress.userId, lists.userId),
            ),
          );

  return rows.map((row) => ({
    userId: row.user.id,
    user: toPublicUser(row.user),
    profiles: addresses
      .filter((a) => a.userId === row.user.id)
      .map((a) => ({ address: a.address.toLowerCase(), nickname: a.nickname })),
    hiddenAt: row.hiddenAt,
  }));
}
