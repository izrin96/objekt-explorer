import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import {
  CANDIDATE_LIMIT,
  type Candidate,
  keyMatchedLists,
  type TheyWant,
} from "../../../lib/trade-rank";
import { hiddenRowsSql, offersSwapsSql } from "../../../lib/trade-sql";
import type { TradeFilter } from "../../../schemas/trade";
import { listedPost, postsCte } from "../feed/query";
import { offerMatchesWantSql, tradePartnerSql } from "../lists";

const HAVING: Record<TradeFilter, ReturnType<typeof sql>> = {
  all: sql``,
  // Mutual is a swap, so only the swap counts can make it; pooled over every list, a superset of
  // the per-post score the recount decides
  mutual: sql`HAVING count(*) FILTER (WHERE they_have AND trade) > 0 AND count(*) FILTER (WHERE NOT they_have AND trade) > 0`,
  they_have: sql`HAVING count(*) FILTER (WHERE they_have) > 0`,
  they_want: sql`HAVING count(*) FILTER (WHERE NOT they_have) > 0`,
};

const ORDER: Record<TradeFilter | "sum", ReturnType<typeof sql>> = {
  // `rankPartners` ranks on the per-post swap score first; the pooled one here only roughly
  // stands in for it, so the cut keeps about the people it ranks first
  all: sql`least(a_t, b_t) DESC, a + b DESC`,
  mutual: sql`least(a_t, b_t) DESC, a + b DESC`,
  they_have: sql`a DESC`,
  they_want: sql`b DESC`,
  // One way's ranking (`oneWayRankOf`), so the cut keeps the people it ranks first
  sum: sql`a + b DESC`,
};

export type CandidateOptions = {
  ownerIds?: string[];
  limit?: number;
  /** the ranking the cut keeps the top of; the filter's own by default */
  order?: TradeFilter | "sum";
  /** false on the person and post pages, which count the posts the viewer hid */
  skipHiddenPosts?: boolean;
};

type CandidateRow = {
  user_id: string;
  list_updated_at: Record<string, string>;
  post_of: Record<string, number[]>;
  post_leads: Record<string, number>;
  they_have: Candidate["theyHave"];
  they_want: TheyWant[];
};

/**
 * Aggregated and pre-ranked in SQL, so a large want list never ships its rows to Node;
 * ownership is checked afterwards, on these candidates only.
 */
export async function fetchTradeCandidates(
  userId: string,
  sides: { haveListIds: number[]; wantListIds: number[] },
  filter: TradeFilter,
  {
    ownerIds,
    limit = CANDIDATE_LIMIT,
    order = filter,
    skipHiddenPosts = true,
  }: CandidateOptions = {},
): Promise<Candidate[]> {
  const result = await db.execute<CandidateRow>(sql`
    WITH ${postsCte},
    -- planned on its own, as the feed's posts are: inlined into partner_posts below, the filters
    -- there shrank its estimate and its anti join became a nested loop over on_trade per post
    all_posts AS MATERIALIZED (SELECT * FROM posts),
    -- the union of my lists' sides on Trade, by list, as listTradeStateSql reads them. Joined LEFT
    -- below, so my_want and my_have keep the row estimates of their real tables: a join to a CTE
    -- there collapsed them to one row and the planner crossed my_want with partner_lists
    my_side_flags AS (
      SELECT side.id, bool_or(tp.match_have) AS match_have, bool_or(tp.match_sale) AS match_sale,
        bool_or(tp.takes_swaps) AS takes_swaps
      FROM trade_post tp
      CROSS JOIN LATERAL (VALUES (tp.lead_list_id, tp.lead_on_trade), (tp.want_list_id, tp.want_on_trade))
        AS side(id, on_trade)
      WHERE tp.user_id = ${userId} AND side.on_trade
      GROUP BY side.id
    ),
    my_want AS (
      SELECT e.collection_slug,
        bool_or(coalesce(f.match_sale, l.match_sale)) AS match_sale,
        bool_or(coalesce(f.match_have, l.match_have)) AS match_have
      FROM list_entries e
      JOIN lists l ON l.id = e.list_id
      LEFT JOIN my_side_flags f ON f.id = l.id
      WHERE e.list_id = ANY(${sql.param(sides.wantListIds)}::int[]) AND e.collection_slug IS NOT NULL
      GROUP BY e.collection_slug
    ),
    my_have AS (
      SELECT e.collection_slug,
        bool_or(l.list_type = 'have' OR (l.list_type = 'sale' AND coalesce(f.takes_swaps, l.takes_swaps)))
          AS on_have,
        bool_or(l.list_type = 'sale') AS on_sale
      FROM list_entries e
      JOIN lists l ON l.id = e.list_id
      LEFT JOIN my_side_flags f ON f.id = l.id
      WHERE e.list_id = ANY(${sql.param(sides.haveListIds)}::int[]) AND e.collection_slug IS NOT NULL
      GROUP BY e.collection_slug
    ),
    -- the partner's posts that take part, as the feed filters them: listed, seen, not hidden. A
    -- post's sides share its freshness and its row's hide, so each post is tested once, and no
    -- side is matched back to its post through a two-column set (whose estimate fell to one row)
    partner_posts AS (
      SELECT posts.id, posts.partner_id, posts.post_id, posts.user_id, posts.type,
        posts.match_sale, posts.match_have, posts.takes_swaps,
        posts.partner_match_sale, posts.partner_match_have
      FROM all_posts posts
      WHERE posts.user_id <> ${userId}
        AND ${listedPost}
        ${ownerIds ? sql`AND posts.user_id = ANY(${sql.param(ownerIds)}::text[])` : sql``}
        AND ${tradePartnerSql(userId, sql`posts.user_id`)}
        ${skipHiddenPosts ? sql`AND posts.post_id NOT IN (${hiddenRowsSql(userId)})` : sql``}
    ),
    -- each list counts with what any of its posts allows (a paired half is always a want list,
    -- whose takes_swaps no rule reads)
    partner_lists AS (
      SELECT side.id, pp.user_id, l.list_type, bool_or(side.match_sale) AS match_sale,
        bool_or(side.match_have) AS match_have, bool_or(side.takes_swaps) AS takes_swaps,
        l.updated_at
      FROM partner_posts pp
      CROSS JOIN LATERAL (VALUES
        (pp.id, pp.match_sale, pp.match_have, pp.takes_swaps),
        (pp.partner_id, pp.partner_match_sale, pp.partner_match_have, false)
      ) AS side(id, match_sale, match_have, takes_swaps)
      JOIN lists l ON l.id = side.id
      GROUP BY side.id, pp.user_id, l.list_type, l.updated_at
    ),
    -- a post is a pair: a posts row with a partner (its lead offers swaps, both halves listed and
    -- not hidden), keyed by its row
    partner_post AS (
      SELECT pp.user_id, half.id, pp.post_id AS post_key, pp.id AS lead_id
      FROM partner_posts pp
      CROSS JOIN LATERAL (VALUES (pp.id), (pp.partner_id)) AS half(id)
      WHERE pp.partner_id IS NOT NULL
    ),
    matched AS (
      -- a swap when the list offers swaps and my want list takes them; a sale when it is a sale
      -- list and my want list buys. A Sell or swap entry can be both
      SELECT p.user_id, p.id AS list_id, p.updated_at, p.match_sale, p.match_have, true AS they_have,
        ${offersSwapsSql("p")} AND w.match_have AS trade, p.list_type = 'sale' AND w.match_sale AS sale,
        e.collection_slug, e.objekt_id
      FROM partner_lists p
      JOIN list_entries e ON e.list_id = p.id
      JOIN my_want w ON w.collection_slug = e.collection_slug
      WHERE p.list_type IN ('have', 'sale') AND ${offerMatchesWantSql("p", "w")}
      UNION ALL
      SELECT p.user_id, p.id, p.updated_at, p.match_sale, p.match_have, false,
        p.match_have AND h.on_have, false, e.collection_slug, NULL
      FROM partner_lists p
      JOIN list_entries e ON e.list_id = p.id
      JOIN my_have h ON h.collection_slug = e.collection_slug
      WHERE p.list_type = 'want' AND ((p.match_have AND h.on_have) OR (p.match_sale AND h.on_sale))
    ),
    grouped AS (
      SELECT
        user_id,
        count(DISTINCT collection_slug) FILTER (WHERE they_have) AS a,
        count(DISTINCT collection_slug) FILTER (WHERE NOT they_have) AS b,
        count(DISTINCT collection_slug) FILTER (WHERE they_have AND trade) AS a_t,
        count(DISTINCT collection_slug) FILTER (WHERE NOT they_have AND trade) AS b_t,
        -- ordered, as they_want's DISTINCT is, by slug then list: the offer picker prefills in this
        -- order and cuts at its side limit, so it must not follow the query plan. Every field
        -- emitted is a key, so rows that tie are identical
        coalesce(
          json_agg(json_build_object(
            'listId', list_id, 'slug', collection_slug, 'objektId', objekt_id,
            'swap', trade, 'sale', sale
          ) ORDER BY collection_slug, list_id, objekt_id NULLS LAST, trade, sale)
            FILTER (WHERE they_have),
          '[]'
        ) AS they_have,
        coalesce(
          json_agg(DISTINCT jsonb_build_object(
            'listId', list_id, 'slug', collection_slug, 'matchSale', match_sale, 'matchHave', match_have
          ))
            FILTER (WHERE NOT they_have),
          '[]'
        ) AS they_want,
        max(updated_at) AS updated_at,
        jsonb_object_agg(list_id, updated_at) AS list_updated_at
      FROM matched
      GROUP BY user_id
      ${HAVING[filter]}
    ),
    -- every partner list's post keys and each key's lead, per person, apart from matched so it
    -- keeps one row per entry; the caller keeps the matched lists' (keyMatchedLists)
    post_of AS (
      SELECT user_id, jsonb_object_agg(id, post_keys) AS post_of
      FROM (
        SELECT user_id, id, array_agg(DISTINCT post_key ORDER BY post_key) AS post_keys
        FROM partner_post GROUP BY user_id, id
      ) keys
      GROUP BY user_id
    ),
    post_leads AS (
      SELECT user_id, jsonb_object_agg(post_key, lead_id) AS post_leads
      FROM (SELECT DISTINCT user_id, post_key, lead_id FROM partner_post) leads
      GROUP BY user_id
    )
    SELECT g.user_id, g.list_updated_at, coalesce(po.post_of, '{}') AS post_of,
      coalesce(pl.post_leads, '{}') AS post_leads, g.they_have, g.they_want
    FROM grouped g
    LEFT JOIN post_of po ON po.user_id = g.user_id
    LEFT JOIN post_leads pl ON pl.user_id = g.user_id
    ORDER BY ${ORDER[order]}, g.updated_at DESC, g.user_id
    LIMIT ${limit}
  `);

  return result.rows.map((row) => {
    const { postOf, postLeads } = keyMatchedLists(
      row.post_of,
      row.post_leads,
      Object.keys(row.list_updated_at),
    );
    return {
      userId: row.user_id,
      listUpdatedAt: Object.fromEntries(
        Object.entries(row.list_updated_at).map(([id, at]) => [id, new Date(at).toISOString()]),
      ),
      postOf,
      postLeads,
      theyHave: row.they_have,
      theyWant: row.they_want,
    };
  });
}
