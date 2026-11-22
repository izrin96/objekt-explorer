import { db } from "@repo/db";
import {
  hiddenTradePartner,
  hiddenTradePost,
  lists,
  tradePost,
  user,
  userAddress,
} from "@repo/db/schema";
import { realNickname } from "@repo/lib/address";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { tradeHandle } from "../../schemas/trade-person";
import { bumpTradeVersions } from "../moderation/safety-cache";
import { toPublicUser } from "../profile";
import { hidePostSql, unhidePostSql } from "./hide-sql";
import { matchableListSql } from "./lists";
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
 * A no-op unless `postId` names another account's post on Trade (see `trade.hidePost`). Idle posts
 * count, so a post can be hidden from its page before its owner bumps it. The hide names the
 * post's row (`hidePostSql`).
 */
export async function hidePost(viewerId: string, postId: number) {
  const inserted = await db.execute<{ post_id: number }>(hidePostSql(viewerId, postId));
  if (inserted.rows.length > 0) await bumpTradeVersions([viewerId]);
}

/** Removes the viewer's hide of the named row (`unhidePostSql`). */
export async function unhidePost(viewerId: string, postId: number) {
  await db.execute(unhidePostSql(viewerId, postId));
  await bumpTradeVersions([viewerId]);
}

/**
 * The posts the viewer hid, newest hide first, each named by the lists of its row now, on Trade
 * or off, and its owner. One entry per hide, which is one per post: `postId` is the row, which
 * `unhidePost` takes.
 */
export async function fetchHiddenPosts(viewerId: string) {
  const lead = alias(lists, "lead");
  const want = alias(lists, "want");
  const rows = await db
    .select({
      postId: tradePost.id,
      // a list of the post that is on Trade, so the link opens the post page
      slug: sql<string>`CASE
        WHEN ${tradePost.leadOnTrade} AND ${matchableListSql("lead")} THEN ${lead.slug}
        WHEN ${tradePost.wantOnTrade} AND ${want.slug} IS NOT NULL THEN ${want.slug}
        ELSE ${lead.slug} END`,
      name: lead.name,
      wantName: want.name,
      profileAddress: lead.profileAddress,
      user,
      hiddenAt: hiddenTradePost.createdAt,
    })
    .from(hiddenTradePost)
    .innerJoin(tradePost, eq(tradePost.id, hiddenTradePost.postId))
    .innerJoin(lead, eq(lead.id, tradePost.leadListId))
    .leftJoin(want, eq(want.id, tradePost.wantListId))
    .innerJoin(user, eq(user.id, lead.userId))
    .where(eq(hiddenTradePost.userId, viewerId))
    .orderBy(desc(hiddenTradePost.createdAt));

  const addresses = await fetchAddresses([...new Set(rows.map((row) => row.user.id))]);
  return rows.map((row) => {
    const owned = addresses.filter((a) => a.userId === row.user.id);
    const bound = owned.find((a) => a.address.toLowerCase() === row.profileAddress?.toLowerCase());
    return {
      postId: row.postId,
      slug: row.slug,
      names: row.wantName === null ? [row.name] : [row.name, row.wantName],
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
