import { db } from "@repo/db";
import { hiddenTradePartner, hiddenTradePost, lists, user, userAddress } from "@repo/db/schema";
import { realNickname } from "@repo/lib/address";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { tradeHandle } from "../../schemas/trade-person";
import { bumpTradeVersions } from "../moderation/safety-cache";
import { toPublicUser } from "../profile";
import { postsCte } from "./feed/query";
import { hidesOfSql, inHiddenPostSql, matchableListSql } from "./lists";
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
 * posts count, so a post can be hidden from its page before its owner bumps it. A post a hide
 * already covers through its other list gets no second hide.
 */
export async function hidePost(viewerId: string, listId: number) {
  const inserted = await db.execute<{ list_id: number }>(sql`
    WITH ${postsCte}
    INSERT INTO hidden_trade_post (user_id, list_id)
    SELECT ${viewerId}, posts.id FROM posts
    WHERE posts.id = ${listId} AND posts.user_id <> ${viewerId}
      AND NOT ${inHiddenPostSql(viewerId, "posts")}
    ON CONFLICT DO NOTHING
    RETURNING list_id
  `);
  if (inserted.rows.length > 0) await bumpTradeVersions([viewerId]);
}

/** Removes every hide of the viewer's that covers `listId`, whichever list of the post it names. */
export async function unhidePost(viewerId: string, listId: number) {
  await db.execute(sql`
    DELETE FROM hidden_trade_post gone
    USING (VALUES (${listId}::int)) AS named(id)
    WHERE gone.user_id = ${viewerId}
      AND gone.list_id IN (SELECT hp.list_id ${hidesOfSql(viewerId, "named")})
  `);
  await bumpTradeVersions([viewerId]);
}

/**
 * The posts the viewer hid, newest hide first, each named by the lists its row pairs now, on
 * Trade or off, and its owner. One entry per post: two hides on one post show as the newer.
 */
export async function fetchHiddenPosts(viewerId: string) {
  const named = alias(lists, "named");
  const lead = alias(lists, "lead");
  const want = alias(lists, "want");
  const found = await db
    .select({
      listId: hiddenTradePost.listId,
      leadId: lead.id,
      // a list of the post that is on Trade, so the link opens the post page
      slug: sql<string>`CASE
        WHEN ${lead.discoverable} AND ${matchableListSql("lead")} THEN ${lead.slug}
        WHEN ${want.discoverable} THEN ${want.slug}
        ELSE ${named.slug} END`,
      name: lead.name,
      wantName: want.name,
      profileAddress: lead.profileAddress,
      user,
      hiddenAt: hiddenTradePost.createdAt,
    })
    .from(hiddenTradePost)
    .innerJoin(named, eq(named.id, hiddenTradePost.listId))
    .innerJoin(
      lead,
      sql`${lead.id} = coalesce(
        (SELECT r.lead_list_id FROM trade_post r
          WHERE r.want_list_id = ${named.id} ORDER BY r.id LIMIT 1),
        ${named.id})`,
    )
    .leftJoin(
      want,
      sql`${want.id} = (SELECT r.want_list_id FROM trade_post r
          WHERE r.lead_list_id = ${lead.id} ORDER BY r.id LIMIT 1)
        AND ${want.userId} = ${lead.userId}`,
    )
    .innerJoin(user, eq(user.id, lead.userId))
    .where(eq(hiddenTradePost.userId, viewerId))
    .orderBy(desc(hiddenTradePost.createdAt));
  const posts = new Set<number>();
  const rows = found.filter((row) => !posts.has(row.leadId) && posts.add(row.leadId));

  const addresses = await fetchAddresses([...new Set(rows.map((row) => row.user.id))]);
  return rows.map((row) => {
    const owned = addresses.filter((a) => a.userId === row.user.id);
    const bound = owned.find((a) => a.address.toLowerCase() === row.profileAddress?.toLowerCase());
    return {
      listId: row.listId,
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
