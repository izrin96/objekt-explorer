import { db } from "@repo/db";
import { type SQL, sql } from "drizzle-orm";

import { FEED_FETCH_SIZE, type PostTag } from "../../lib/trade-feed";
import { IDLE_DAYS } from "../../lib/trade-rank";
import type { ListTypeNew } from "../../schemas/list";
import type { FeedCursor, PostType } from "../../schemas/trade";
import { notBlockedEither, notTradeSanctioned } from "../safety";
import { takesPartInTradeSql } from "../trade-lists";

const TAG_TYPE: Record<PostTag, ListTypeNew> = { wtt: "have", wtb: "want", wts: "sale" };

/**
 * Posts on Trade: each list on Trade, with a want list folded into the have list that links
 * to it when both are on Trade. A post's bump and change times are the latest of its lists.
 */
export const postsCte = sql`
  on_trade AS (
    SELECT id, user_id, list_type_new, linked_list_id, bumped_at, updated_at, created_at
    FROM lists
    WHERE discoverable AND ${takesPartInTradeSql()}
  ),
  posts AS (
    SELECT
      a.id,
      a.user_id,
      a.list_type_new AS type,
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
const matchesIndex = (index: { want: string[]; have: string[] }) =>
  sql`EXISTS (
    SELECT 1 FROM list_entries e
    JOIN on_trade t ON t.id = e.list_id
    WHERE e.list_id IN (posts.id, posts.partner_id)
      AND (
        (t.list_type_new IN ('have', 'sale') AND e.collection_slug = ANY(${sql.param(index.want)}::text[]))
        OR (t.list_type_new = 'want' AND e.collection_slug = ANY(${sql.param(index.have)}::text[]))
      )
  )`;

export type FeedRow = {
  id: number;
  partner_id: number | null;
  cursor_at: string;
  message_allow: string | null;
};

type Stage1 = {
  viewerId: string | null;
  type: PostType;
  slugs: string[] | null;
  slug: string | null;
  /** the viewer's want and have slugs, when Only matches is on */
  matches: { want: string[]; have: string[] } | null;
  cursor: FeedCursor | undefined;
};

/** Stage 1: which posts make the page, in order. Uncached; it reads only the partial index's rows. */
export async function fetchFeedRows(query: Stage1): Promise<FeedRow[]> {
  const where: SQL[] = [listedPost, notTradeSanctioned(sql`posts.user_id`)];
  if (query.viewerId !== null) {
    where.push(sql`posts.user_id <> ${query.viewerId}`);
    where.push(notBlockedEither(query.viewerId, sql`posts.user_id`));
    where.push(sql`NOT EXISTS (
      SELECT 1 FROM hidden_trade_partner h
      WHERE h.user_id = ${query.viewerId} AND h.hidden_user_id = posts.user_id
    )`);
  }
  if (query.type !== "all") where.push(sql`posts.type = ${TAG_TYPE[query.type]}`);
  if (query.slugs) where.push(hasEntryIn(sql`posts.id, posts.partner_id`, query.slugs));
  if (query.slug !== null) where.push(hasEntryIn(sql`posts.id, posts.partner_id`, [query.slug]));
  if (query.matches) where.push(matchesIndex(query.matches));
  if (query.cursor) {
    where.push(
      sql`(posts.bumped_at, posts.id) < (${query.cursor.bumpedAt}::timestamptz, ${query.cursor.id})`,
    );
  }

  const result = await db.execute<FeedRow>(sql`
    WITH ${postsCte}
    SELECT
      posts.id,
      posts.partner_id,
      posts.bumped_at::text AS cursor_at,
      mp.allow AS message_allow
    FROM posts
    LEFT JOIN message_pref mp ON mp.user_id = posts.user_id
    WHERE ${sql.join(where, sql` AND `)}
    ORDER BY posts.bumped_at DESC, posts.id DESC
    LIMIT ${FEED_FETCH_SIZE}
  `);
  return result.rows;
}
