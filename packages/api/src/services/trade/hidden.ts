import { db } from "@repo/db";
import { hiddenTradePartner, hiddenTradePost, lists, user, userAddress } from "@repo/db/schema";
import { realNickname } from "@repo/lib/address";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { tradeHandle } from "../../schemas/trade-person";
import { bumpTradeVersions } from "../moderation/safety-cache";
import { toPublicUser } from "../profile";
import { postsCte } from "./feed/query";
import { postPartnerSql } from "./lists";
import { fetchAddresses } from "./matches/holdings";

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

/**
 * A no-op unless `listId` leads another account's post on Trade (see `trade.hidePost`). Idle
 * posts count, so a post can be hidden from its page before its owner bumps it.
 */
export async function hidePost(viewerId: string, listId: number) {
  const inserted = await db.execute<{ list_id: number }>(sql`
    WITH ${postsCte}
    INSERT INTO hidden_trade_post (user_id, list_id)
    SELECT ${viewerId}, posts.id FROM posts WHERE posts.id = ${listId} AND posts.user_id <> ${viewerId}
    ON CONFLICT DO NOTHING
    RETURNING list_id
  `);
  if (inserted.rows.length > 0) await bumpTradeVersions([viewerId]);
}

export async function unhidePost(viewerId: string, listId: number) {
  await db
    .delete(hiddenTradePost)
    .where(and(eq(hiddenTradePost.userId, viewerId), eq(hiddenTradePost.listId, listId)));
  await bumpTradeVersions([viewerId]);
}

/** The posts the viewer hid, newest first, each with its lists' names and its owner. */
export async function fetchHiddenPosts(viewerId: string) {
  const partner = sql.raw("partner");
  const rows = await db
    .select({
      listId: lists.id,
      slug: lists.slug,
      name: lists.name,
      profileAddress: lists.profileAddress,
      partnerName: sql<string | null>`(
        SELECT ${partner}.name FROM lists ${partner}
        WHERE ${partner}.id = ${postPartnerSql("lists")} AND ${partner}.user_id = ${lists.userId}
          AND ${lists.listType} <> 'want' AND ${partner}.list_type = 'want'
      )`,
      user,
      hiddenAt: hiddenTradePost.createdAt,
    })
    .from(hiddenTradePost)
    .innerJoin(lists, eq(lists.id, hiddenTradePost.listId))
    .innerJoin(user, eq(user.id, lists.userId))
    .where(eq(hiddenTradePost.userId, viewerId))
    .orderBy(desc(hiddenTradePost.createdAt));

  const addresses = await fetchAddresses([...new Set(rows.map((row) => row.user.id))]);
  return rows.map((row) => {
    const owned = addresses.filter((a) => a.userId === row.user.id);
    const bound = owned.find((a) => a.address.toLowerCase() === row.profileAddress?.toLowerCase());
    return {
      listId: row.listId,
      slug: row.slug,
      names: row.partnerName === null ? [row.name] : [row.name, row.partnerName],
      userId: row.user.id,
      user: toPublicUser(row.user),
      handle: tradeHandle(owned),
      // the profile the post is bound to, as For you names a partner
      profile: bound
        ? {
            address: bound.address.toLowerCase(),
            nickname: realNickname(bound.address, bound.nickname),
          }
        : null,
      hiddenAt: row.hiddenAt,
    };
  });
}
