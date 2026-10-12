import { db } from "@repo/db";
import { type SQL, sql } from "drizzle-orm";

import { cursorScope, FEED_FETCH_SIZE, type MatchIndex, type PostTag } from "../../lib/trade-feed";
import { IDLE_DAYS } from "../../lib/trade-rank";
import type { PostType } from "../../schemas/trade";
import { notBlockedEither, notTradeSanctioned } from "../safety";
import { takesPartInTradeSql } from "../trade-lists";

/** As `postTag` tags a post: a want list alone that matches swaps only is WTT, not WTB. */
const TAG_WHERE: Record<PostTag, SQL> = {
  wtt: sql`(posts.type = 'have' OR (posts.type = 'want' AND NOT posts.match_sale))`,
  wtb: sql`(posts.type = 'want' AND posts.match_sale)`,
  wts: sql`posts.type = 'sale'`,
};

/**
 * Posts on Trade: each list on Trade, with a want list folded into the have list that links
 * to it when both are on Trade. A post's bump and change times are the latest of its lists.
 */
export const postsCte = sql`
  on_trade AS (
    SELECT id, user_id, list_type_new, linked_list_id, match_sale, bumped_at, updated_at, created_at
    FROM lists
    WHERE discoverable AND ${takesPartInTradeSql()}
  ),
  posts AS (
    SELECT
      a.id,
      a.user_id,
      a.list_type_new AS type,
      a.match_sale,
      p.id AS partner_id,
      -- milliseconds, so the ISO cursor names a row exactly; a post never bumped sorts by its
      -- last change
      date_trunc(
        'milliseconds',
        coalesce(greatest(a.bumped_at, p.bumped_at), greatest(a.updated_at, p.updated_at))
      ) AS bumped_at,
      greatest(a.updated_at, p.updated_at) AS updated_at
    FROM on_trade a
    LEFT JOIN on_trade p
      ON a.list_type_new = 'have'
      AND p.id = a.linked_list_id
      AND p.list_type_new = 'want'
      AND p.user_id = a.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM on_trade h
      WHERE a.list_type_new = 'want'
        AND h.list_type_new = 'have'
        AND h.linked_list_id = a.id
        AND h.user_id = a.user_id
    )
  )
`;

export const listedPost = sql`greatest(posts.bumped_at, posts.updated_at) > now() - make_interval(days => ${IDLE_DAYS})`;

const hasEntryIn = (listIds: SQL, slugs: string[]) =>
  sql`EXISTS (
    SELECT 1 FROM list_entries e
    WHERE e.list_id IN (${listIds}) AND e.collection_slug = ANY(${sql.param(slugs)}::text[])
  )`;

/** A post entry that would show in the viewer's match line, in either direction. */
const matchesIndex = (index: MatchIndex) =>
  sql`EXISTS (
    SELECT 1 FROM list_entries e
    JOIN on_trade t ON t.id = e.list_id
    WHERE e.list_id IN (posts.id, posts.partner_id)
      AND (
        (t.list_type_new = 'have' AND e.collection_slug = ANY(${sql.param(index.want)}::text[]))
        OR (t.list_type_new = 'sale' AND e.collection_slug = ANY(${sql.param(index.saleWant)}::text[]))
        OR (t.list_type_new = 'want' AND e.collection_slug = ANY(
          CASE WHEN t.match_sale THEN ${sql.param(index.have)}::text[] ELSE ${sql.param(index.tradeHave)}::text[] END
        ))
      )
  )`;

export type FeedRow = {
  id: number;
  partner_id: number | null;
  user_id: string;
  cursor_at: string;
  message_allow: string | null;
};

type Stage1 = {
  viewerId: string | null;
  type: PostType;
  slugs: string[] | null;
  slug: string | null;
  /** the viewer's slugs by the post side they match, when matching is on */
  matches: MatchIndex | null;
  /** Mutual: only these owners, best first, grouped; `resume` is the cursor's owner, first in `ids` */
  owners: { ids: string[]; resume: boolean } | null;
  cursor: { bumpedAt: string; id: number } | undefined;
};

/** The predicates every feed read shares: listed, visible to the viewer, and the filters. */
export function feedWhere(query: Omit<Stage1, "owners" | "cursor">): SQL[] {
  const where: SQL[] = [listedPost, notTradeSanctioned(sql`posts.user_id`)];
  if (query.viewerId !== null) {
    where.push(sql`posts.user_id <> ${query.viewerId}`);
    where.push(notBlockedEither(query.viewerId, sql`posts.user_id`));
    where.push(sql`NOT EXISTS (
      SELECT 1 FROM hidden_trade_partner h
      WHERE h.user_id = ${query.viewerId} AND h.hidden_user_id = posts.user_id
    )`);
  }
  if (query.type !== "all") where.push(TAG_WHERE[query.type]);
  if (query.slugs) where.push(hasEntryIn(sql`posts.id, posts.partner_id`, query.slugs));
  if (query.slug !== null) where.push(hasEntryIn(sql`posts.id, posts.partner_id`, [query.slug]));
  if (query.matches) where.push(matchesIndex(query.matches));
  return where;
}

/** Stage 1: which posts make the page, in order. Uncached; it reads only the partial index's rows. */
export async function fetchFeedRows(query: Stage1): Promise<FeedRow[]> {
  const where = feedWhere(query);
  const { owners, cursor } = query;
  if (owners) where.push(sql`posts.user_id = ANY(${sql.param(owners.ids)}::text[])`);
  const scope = cursorScope(owners);
  if (cursor && scope !== "none") {
    const after = sql`(posts.bumped_at, posts.id) < (${cursor.bumpedAt}::timestamptz, ${cursor.id})`;
    where.push(scope === "first" ? sql`(posts.user_id <> ${owners!.ids[0]} OR ${after})` : after);
  }

  const result = await db.execute<FeedRow>(sql`
    WITH ${postsCte}
    SELECT
      posts.id,
      posts.partner_id,
      posts.user_id,
      posts.bumped_at::text AS cursor_at,
      mp.allow AS message_allow
    FROM posts
    LEFT JOIN message_pref mp ON mp.user_id = posts.user_id
    WHERE ${sql.join(where, sql` AND `)}
    ORDER BY ${owners ? sql`array_position(${sql.param(owners.ids)}::text[], posts.user_id), ` : sql``}posts.bumped_at DESC, posts.id DESC
    LIMIT ${FEED_FETCH_SIZE}
  `);
  return result.rows;
}

/** How many of `ownerIds` have at least one post the stage-1 predicates keep. */
export async function countFeedOwners(
  query: Omit<Stage1, "owners" | "cursor">,
  ownerIds: string[],
): Promise<number> {
  if (ownerIds.length === 0) return 0;
  const where = [...feedWhere(query), sql`posts.user_id = ANY(${sql.param(ownerIds)}::text[])`];
  const result = await db.execute<{ n: number }>(sql`
    WITH ${postsCte}
    SELECT count(DISTINCT posts.user_id)::int AS n FROM posts
    WHERE ${sql.join(where, sql` AND `)}
  `);
  return result.rows[0]?.n ?? 0;
}
