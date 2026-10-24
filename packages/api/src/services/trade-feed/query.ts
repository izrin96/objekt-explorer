import { db } from "@repo/db";
import { type SQL, sql } from "drizzle-orm";

import { cursorScope, FEED_FETCH_SIZE, type MatchIndex, type PostTag } from "../../lib/trade-feed";
import { IDLE_DAYS } from "../../lib/trade-rank";
import { PERSON_POST_LIMIT, type PostType } from "../../schemas/trade";
import { notBlockedEither, notTradeSanctioned } from "../safety";
import { takesPartInTradeSql } from "../trade-lists";

/**
 * The SQL twin of `tagsOf` (schemas/trade-post.ts): WTT for a have list or a want list alone open
 * to swaps, WTB for a want side open to buying (a want list alone, or a have list's partner on
 * Trade), WTS for a sale list. `wtt` reads no partner column, since `excludeWttOf` negates it.
 */
const TAG_WHERE: Record<PostTag, SQL> = {
  wtt: sql`(posts.type = 'have' OR (posts.type = 'want' AND posts.match_have))`,
  wtb: sql`(
    (posts.type = 'want' AND (posts.match_sale OR NOT posts.match_have))
    OR (posts.type = 'have' AND posts.partner_id IS NOT NULL
      AND (coalesce(posts.partner_match_sale, false) OR NOT coalesce(posts.partner_match_have, true)))
  )`,
  wts: sql`posts.type = 'sale'`,
};

/**
 * Posts on Trade: each list on Trade, with a want list folded into the have list that links
 * to it when both are on Trade. A post's bump and change times are the latest of its lists.
 */
export const postsCte = sql`
  on_trade AS (
    SELECT id, user_id, list_type, linked_list_id, match_sale, match_have, bumped_at, updated_at, created_at
    FROM lists
    WHERE discoverable AND ${takesPartInTradeSql()}
  ),
  posts AS (
    SELECT
      a.id,
      a.user_id,
      a.list_type AS type,
      a.match_sale,
      a.match_have,
      p.id AS partner_id,
      p.match_sale AS partner_match_sale,
      p.match_have AS partner_match_have,
      -- milliseconds, so the ISO cursor names a row exactly; a post never bumped sorts by its
      -- last change
      date_trunc(
        'milliseconds',
        coalesce(greatest(a.bumped_at, p.bumped_at), greatest(a.updated_at, p.updated_at))
      ) AS bumped_at,
      greatest(a.updated_at, p.updated_at) AS updated_at
    FROM on_trade a
    LEFT JOIN on_trade p
      ON a.list_type = 'have'
      AND p.id = a.linked_list_id
      AND p.list_type = 'want'
      AND p.user_id = a.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM on_trade h
      WHERE a.list_type = 'want'
        AND h.list_type = 'have'
        AND h.linked_list_id = a.id
        AND h.user_id = a.user_id
    )
  )
`;

export const listedPost = sql`greatest(posts.bumped_at, posts.updated_at) > now() - make_interval(days => ${IDLE_DAYS})`;

/** The lists inside a listed post, as a set; follows {@link postsCte}. An idle list is in no post. */
export const listedCte = sql`
  listed AS (
    SELECT id FROM posts WHERE ${listedPost}
    UNION
    SELECT partner_id FROM posts WHERE ${listedPost} AND partner_id IS NOT NULL
  )
`;

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
        (t.list_type = 'have' AND e.collection_slug = ANY(${sql.param(index.tradeWant)}::text[]))
        OR (t.list_type = 'sale' AND e.collection_slug = ANY(${sql.param(index.saleWant)}::text[]))
        OR (t.list_type = 'want' AND e.collection_slug = ANY(
          -- the SQL twin of openToOf (schemas/open-to.ts)
          CASE
            WHEN NOT t.match_have THEN ${sql.param(index.saleHave)}::text[]
            WHEN t.match_sale THEN ${sql.param(index.have)}::text[]
            ELSE ${sql.param(index.tradeHave)}::text[]
          END
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

export type FeedQuery = {
  viewerId: string | null;
  type: PostType;
  slugs: string[] | null;
  slug: string | null;
  /** the viewer's slugs by the post side they match, when matching is on */
  matches: MatchIndex | null;
};

type Stage1 = FeedQuery & {
  /** Mutual: only these owners, best first, grouped; `resume` is the cursor's owner, first in `ids` */
  owners: { ids: string[]; resume: boolean } | null;
  cursor: { bumpedAt: string; id: number } | undefined;
  /** leave out every post of these owners: the tail's, past the people ranked before it */
  excludeOwners?: string[];
  /** leave out the WTT posts of these owners, which the Mutual section lists */
  excludeWttOf?: string[];
};

/** The predicates every feed read shares: listed, visible to the viewer, and the filters. */
export function feedWhere(query: FeedQuery): SQL[] {
  const where: SQL[] = [listedPost, notTradeSanctioned(sql`posts.user_id`)];
  if (query.viewerId !== null) {
    where.push(notBlockedEither(query.viewerId, sql`posts.user_id`));
    where.push(sql`NOT EXISTS (
      SELECT 1 FROM hidden_trade_partner h
      WHERE h.user_id = ${query.viewerId} AND h.hidden_user_id = posts.user_id
    )`);
  }
  if (query.type !== "all") where.push(TAG_WHERE[query.type]);
  if (query.slugs) where.push(hasEntryIn(sql`posts.id, posts.partner_id`, query.slugs));
  if (query.slug !== null) where.push(hasEntryIn(sql`posts.id, posts.partner_id`, [query.slug]));
  if (query.matches) {
    where.push(matchesIndex(query.matches));
    // the viewer's own posts show on the plain feed, so they can see a bump land, but never as a match
    if (query.viewerId !== null) where.push(sql`posts.user_id <> ${query.viewerId}`);
  }
  return where;
}

/** Stage 1: which posts make the page, in order. Uncached; it reads only the partial index's rows. */
export async function fetchFeedRows(query: Stage1): Promise<FeedRow[]> {
  const where = feedWhere(query);
  const { owners, cursor, excludeOwners, excludeWttOf } = query;
  if (owners) where.push(sql`posts.user_id = ANY(${sql.param(owners.ids)}::text[])`);
  if (excludeOwners?.length) {
    where.push(sql`NOT (posts.user_id = ANY(${sql.param(excludeOwners)}::text[]))`);
  }
  if (excludeWttOf?.length) {
    where.push(
      sql`NOT (posts.user_id = ANY(${sql.param(excludeWttOf)}::text[]) AND ${TAG_WHERE.wtt})`,
    );
  }
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
export async function countFeedOwners(query: FeedQuery, ownerIds: string[]): Promise<number> {
  if (ownerIds.length === 0) return 0;
  const where = [...feedWhere(query), sql`posts.user_id = ANY(${sql.param(ownerIds)}::text[])`];
  const result = await db.execute<{ n: number }>(sql`
    WITH ${postsCte}
    SELECT count(DISTINCT posts.user_id)::int AS n FROM posts
    WHERE ${sql.join(where, sql` AND `)}
  `);
  return result.rows[0]?.n ?? 0;
}

/** The owners to leave out, as a predicate. */
const withoutOwners = (ids: string[] | undefined): SQL[] =>
  ids?.length ? [sql`NOT (posts.user_id = ANY(${sql.param(ids)}::text[]))`] : [];

/**
 * People with a kept post in the plain bump order, newest first: the order of Browse and the
 * tail. A person's place is their newest kept post; the keyset `(bump, user id)` holds back
 * everyone up to the last person shown.
 */
export async function fetchBumpPeople(
  query: FeedQuery,
  page: {
    limit: number;
    cursor?: { bumpedAt: string; userId: string };
    excludeOwners?: string[];
  },
): Promise<{ user_id: string; cursor_at: string }[]> {
  const where = [...feedWhere(query), ...withoutOwners(page.excludeOwners)];
  const { cursor } = page;
  const result = await db.execute<{ user_id: string; cursor_at: string }>(sql`
    WITH ${postsCte}
    SELECT posts.user_id, max(posts.bumped_at)::text AS cursor_at
    FROM posts
    WHERE ${sql.join(where, sql` AND `)}
    GROUP BY posts.user_id
    ${
      cursor
        ? sql`HAVING (max(posts.bumped_at), posts.user_id) < (${cursor.bumpedAt}::timestamptz, ${cursor.userId})`
        : sql``
    }
    ORDER BY max(posts.bumped_at) DESC, posts.user_id DESC
    LIMIT ${page.limit}
  `);
  return result.rows;
}

/** Which of `ownerIds` have at least one post the stage-1 predicates keep. */
export async function fetchFeedOwners(query: FeedQuery, ownerIds: string[]): Promise<Set<string>> {
  if (ownerIds.length === 0) return new Set();
  const where = [...feedWhere(query), sql`posts.user_id = ANY(${sql.param(ownerIds)}::text[])`];
  const result = await db.execute<{ user_id: string }>(sql`
    WITH ${postsCte}
    SELECT DISTINCT posts.user_id FROM posts
    WHERE ${sql.join(where, sql` AND `)}
  `);
  return new Set(result.rows.map((row) => row.user_id));
}

/**
 * Every kept post of `ownerIds`, newest bump first within each person, at most
 * `PERSON_POST_LIMIT` a person. The people's order is the caller's.
 */
export async function fetchPersonRows(query: FeedQuery, ownerIds: string[]): Promise<FeedRow[]> {
  if (ownerIds.length === 0) return [];
  const where = [...feedWhere(query), sql`posts.user_id = ANY(${sql.param(ownerIds)}::text[])`];
  const result = await db.execute<FeedRow>(sql`
    WITH ${postsCte},
    kept AS (
      SELECT
        posts.id,
        posts.partner_id,
        posts.user_id,
        posts.bumped_at,
        mp.allow AS message_allow,
        row_number() OVER (
          PARTITION BY posts.user_id ORDER BY posts.bumped_at DESC, posts.id DESC
        ) AS place
      FROM posts
      LEFT JOIN message_pref mp ON mp.user_id = posts.user_id
      WHERE ${sql.join(where, sql` AND `)}
    )
    SELECT id, partner_id, user_id, bumped_at::text AS cursor_at, message_allow
    FROM kept
    WHERE place <= ${PERSON_POST_LIMIT}
    ORDER BY user_id, bumped_at DESC, id DESC
  `);
  return result.rows;
}
