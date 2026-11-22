import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { lists, tradePost } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { refuse } from "../../../lib/refuse";
import { iso } from "../../../lib/time";
import {
  BUMP_COOLDOWN_HOURS,
  comparePosts,
  isPostIdle,
  latest,
  nextBumpAt,
} from "../../../lib/trade-posts";
import { personBumpSql } from "../../../lib/trade-sql";
import { tradeHandle } from "../../../schemas/trade-person";
import { postKindOf } from "../../../schemas/trade-post";
import { lockTradeLists } from "../../list/shared";
import { notTradeSanctioned } from "../../moderation/safety";
import { matchableList, matchableListSql } from "../lists";
import { fetchAddresses } from "../matches/holdings";
import { feedListColumns, fetchPostRows, postOfFeedRow } from "./entries";
import { postsCte } from "./query";

/** The person's posts on Trade, listed or idle, each built from its own row. */
async function fetchOwnPosts(userId: string) {
  const [postRows, ownLists, rowById] = await Promise.all([
    db.execute<{ id: number; partner_id: number | null; post_id: number }>(sql`
      WITH ${postsCte}
      SELECT posts.id, posts.partner_id, posts.post_id FROM posts WHERE posts.user_id = ${userId}
    `),
    db
      .select(feedListColumns)
      .from(lists)
      .where(and(eq(lists.userId, userId), matchableList)),
    fetchPostRows(eq(tradePost.userId, userId)),
  ]);
  const listById = new Map(ownLists.map((list) => [list.id, list]));
  return postRows.rows.flatMap((row) => postOfFeedRow(row, rowById, listById) ?? []);
}

export async function fetchMyPosts(userId: string) {
  const now = new Date();
  const [own, lastBump, tradeBlocked, addressRows] = await Promise.all([
    fetchOwnPosts(userId),
    lastBumpOf(userId),
    isTradeBlocked(userId),
    fetchAddresses([userId]),
  ]);
  const next = nextBumpAt(lastBump, now);
  const handle = tradeHandle(addressRows);
  // every post carries the person's last and next bump, and whether a trade block hides them
  return own.toSorted(comparePosts).map((post) => ({
    id: post.anchor.postId,
    slug: post.anchor.slug,
    tags: post.tags,
    kind: postKindOf(post).kind,
    alsoPay: postKindOf(post).alsoPay,
    lists: [post.have, post.sale, post.want].flatMap((list) =>
      list
        ? [
            {
              slug: list.slug,
              name: list.name,
              listType: list.listType,
              role: list.listType as "have" | "want" | "sale",
            },
          ]
        : [],
    ),
    listed: !isPostIdle(post, now),
    bumpedAt: iso(post.bumpedAt),
    updatedAt: iso(post.updatedAt)!,
    lastBumpAt: iso(lastBump),
    nextBumpAt: next,
    tradeBlocked,
    handle,
  }));
}

export async function isTradeBlocked(userId: string) {
  const { rows } = await db.execute<{ blocked: boolean }>(
    sql`SELECT NOT ${notTradeSanctioned(userId)} AS blocked`,
  );
  return rows[0]?.blocked ?? false;
}

async function lastBumpOf(userId: string) {
  const { rows } = await db.execute<{ at: string | null }>(
    sql`SELECT ${personBumpSql(userId)}::text AS at`,
  );
  return rows[0]?.at ?? null;
}

/**
 * Every post on Trade is bumped together, or none: one statement bumps each on-Trade side of the
 * person's `trade_post` rows whose list is matchable, so a person whose only side on Trade holds
 * an unmatchable list gets NOT_FOUND, not a cooldown. The NOT EXISTS reads every side of their
 * rows, on Trade or not, as `personBumpSql` does.
 */
export async function bumpPerson(userId: string) {
  const result = await db.transaction(async (tx) => {
    // the statement reads the snapshot it started with, so a row a post writer inserted while it
    // waited would keep its side's old bump; under the lock it starts after any such writer committed
    await lockTradeLists(tx, userId);
    return tx.execute<{ bumped_at: string }>(sql`
      WITH sides AS (
        SELECT tp.id,
          tp.lead_on_trade AND ${matchableListSql("lead")} AS lead_bumps,
          tp.want_on_trade AND coalesce(${matchableListSql("want")}, false) AS want_bumps
        FROM trade_post tp
        JOIN lists lead ON lead.id = tp.lead_list_id
        LEFT JOIN lists want ON want.id = tp.want_list_id
        WHERE tp.user_id = ${userId}
      )
      UPDATE trade_post tp SET
        lead_bumped_at = CASE WHEN s.lead_bumps THEN now() ELSE tp.lead_bumped_at END,
        want_bumped_at = CASE WHEN s.want_bumps THEN now() ELSE tp.want_bumped_at END
      FROM sides s
      WHERE tp.id = s.id AND (s.lead_bumps OR s.want_bumps)
        AND NOT EXISTS (
          SELECT 1 FROM trade_post x
          WHERE x.user_id = ${userId}
            AND greatest(x.lead_bumped_at, x.want_bumped_at) > now() - make_interval(hours => ${BUMP_COOLDOWN_HOURS})
        )
      RETURNING now()::text AS bumped_at
    `);
  });

  const now = new Date();
  const bumped = latest(...result.rows.map((row) => row.bumped_at));
  if (bumped !== null) return { bumpedAt: iso(bumped)!, nextBumpAt: nextBumpAt(bumped, now) };

  const next = nextBumpAt(await lastBumpOf(userId), now);
  if (next === null) throw new ORPCError("NOT_FOUND");
  // `nextBumpAt` too, for tabs from before the reason
  refuse("TOO_MANY_REQUESTS", "trade_bump_too_soon", "One bump a day", {
    retryAt: next,
    nextBumpAt: next,
  });
}
