import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { refuse } from "../../../lib/refuse";
import { iso } from "../../../lib/time";
import {
  BUMP_COOLDOWN_HOURS,
  comparePosts,
  isPostIdle,
  latest,
  nextBumpAt,
  pairPosts,
} from "../../../lib/trade-feed";
import { tradeHandle } from "../../../schemas/trade-person";
import { postKindOf } from "../../../schemas/trade-post";
import { notTradeSanctioned } from "../../moderation/safety";
import { matchableList, matchableListSql } from "../lists";
import { fetchAddresses } from "../matches/holdings";
import { feedListColumns } from "./entries";

async function fetchOwnTradeLists(userId: string) {
  return db
    .select(feedListColumns)
    .from(lists)
    .where(and(eq(lists.userId, userId), eq(lists.discoverable, true), matchableList));
}

export async function fetchMyPosts(userId: string) {
  const now = new Date();
  const [own, lastBump, tradeBlocked, addressRows] = await Promise.all([
    fetchOwnTradeLists(userId),
    lastBumpOf(userId),
    isTradeBlocked(userId),
    fetchAddresses([userId]),
  ]);
  const next = nextBumpAt(lastBump, now);
  const handle = tradeHandle(addressRows);
  // every post carries the person's last and next bump, and whether a trade block hides them
  return pairPosts(own)
    .toSorted(comparePosts)
    .map((post) => ({
      id: post.anchor.id,
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
  const [row] = await db
    .select({ at: sql<string | null>`max(${lists.bumpedAt})::text` })
    .from(lists)
    .where(eq(lists.userId, userId));
  return row?.at ?? null;
}

/**
 * One statement: every post on Trade is bumped together, or none. The row-level cooldown check is
 * what EvalPlanQual re-reads under a concurrent bump; the NOT EXISTS covers the person's other
 * lists, Trade or not, bumped more recently.
 */
export async function bumpPerson(userId: string) {
  const result = await db.execute<{ bumped_at: string }>(sql`
    UPDATE lists SET bumped_at = now()
    WHERE user_id = ${userId}
      AND discoverable
      AND ${matchableListSql()}
      AND (bumped_at IS NULL OR bumped_at <= now() - make_interval(hours => ${BUMP_COOLDOWN_HOURS}))
      AND NOT EXISTS (
        SELECT 1 FROM lists x
        WHERE x.user_id = ${userId}
          AND x.bumped_at > now() - make_interval(hours => ${BUMP_COOLDOWN_HOURS})
      )
    RETURNING bumped_at::text
  `);

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
