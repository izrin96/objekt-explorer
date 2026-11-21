import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { CANDIDATE_LIMIT, type Candidate, type TheyWant } from "../../../lib/trade-rank";
import { hiddenRowsSql, listTradeStateSql, offersSwapsSql } from "../../../lib/trade-sql";
import type { TradeFilter } from "../../../schemas/trade";
import { listedPostsCte, postsCte } from "../feed/query";
import { offerMatchesWantSql, postPairsSql, tradePartnerSql } from "../lists";

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
    -- a set, so each side is one hash lookup rather than a scan of posts
    ${listedPostsCte},
    -- each of my lists counts with the union of its posts on Trade, else its own Open to
    my_lists AS (
      SELECT l.id, l.list_type,
        ${listTradeStateSql("l", "matchSale")} AS match_sale,
        ${listTradeStateSql("l", "matchHave")} AS match_have,
        ${listTradeStateSql("l", "takesSwaps")} AS takes_swaps
      FROM lists l
      WHERE l.id = ANY(${sql.param([...sides.wantListIds, ...sides.haveListIds])}::int[])
    ),
    my_want AS (
      SELECT e.collection_slug, bool_or(l.match_sale) AS match_sale, bool_or(l.match_have) AS match_have
      FROM list_entries e
      JOIN my_lists l ON l.id = e.list_id
      WHERE e.list_id = ANY(${sql.param(sides.wantListIds)}::int[]) AND e.collection_slug IS NOT NULL
      GROUP BY e.collection_slug
    ),
    my_have AS (
      SELECT e.collection_slug, bool_or(${offersSwapsSql("l")}) AS on_have,
        bool_or(l.list_type = 'sale') AS on_sale
      FROM list_entries e
      JOIN my_lists l ON l.id = e.list_id
      WHERE e.list_id = ANY(${sql.param(sides.haveListIds)}::int[]) AND e.collection_slug IS NOT NULL
      GROUP BY e.collection_slug
    ),
    -- each side through on_trade, so a partner's Open to and takes_swaps are its post's
    partner_sides AS (
      SELECT l.id, l.post_id, l.user_id, l.list_type, l.match_sale, l.match_have, l.takes_swaps,
        l.updated_at
      FROM on_trade l
      WHERE l.user_id <> ${userId}
        -- an idle post does not count: a pair's lists share the pair's freshness
        AND (l.post_id, l.id) IN (SELECT post_id, id FROM listed_posts)
        ${ownerIds ? sql`AND l.user_id = ANY(${sql.param(ownerIds)}::text[])` : sql``}
        AND ${tradePartnerSql(userId, sql`l.user_id`)}
        ${skipHiddenPosts ? sql`AND l.post_id NOT IN (${hiddenRowsSql(userId)})` : sql``}
    ),
    -- a list in several posts counts with what any of them allows
    partner_lists AS (
      SELECT id, user_id, list_type, bool_or(match_sale) AS match_sale,
        bool_or(match_have) AS match_have, bool_or(takes_swaps) AS takes_swaps,
        max(updated_at) AS updated_at
      FROM partner_sides
      GROUP BY id, user_id, list_type
    ),
    -- a post is a pair in one trade_post row whose offering half can swap, keyed by the row; both
    -- halves must take part, so a list paired with an unlisted one keys to no post
    partner_post AS (
      SELECT o.user_id, half.id, o.post_id AS post_key, o.id AS lead_id
      FROM partner_sides o
      JOIN trade_post tp ON tp.id = o.post_id
      JOIN partner_sides w ON w.post_id = o.post_id AND ${postPairsSql("tp", "o", "w")}
      CROSS JOIN LATERAL (VALUES (o.id), (w.id)) AS half(id)
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
    -- apart from matched, so it keeps one row per entry: each matched list's post keys, and the
    -- lead of each key
    matched_keys AS (
      SELECT DISTINCT pp.user_id, pp.id AS list_id, pp.post_key, pp.lead_id
      FROM partner_post pp
      WHERE (pp.user_id, pp.id) IN (SELECT user_id, list_id FROM matched)
    ),
    post_of AS (
      SELECT user_id, jsonb_object_agg(list_id, post_keys) AS post_of
      FROM (
        SELECT user_id, list_id, array_agg(post_key ORDER BY post_key) AS post_keys
        FROM matched_keys GROUP BY user_id, list_id
      ) keys
      GROUP BY user_id
    ),
    post_leads AS (
      SELECT user_id, jsonb_object_agg(post_key, lead_id) AS post_leads
      FROM (SELECT DISTINCT user_id, post_key, lead_id FROM matched_keys) leads
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

  return result.rows.map((row) => ({
    userId: row.user_id,
    listUpdatedAt: Object.fromEntries(
      Object.entries(row.list_updated_at).map(([id, at]) => [id, new Date(at).toISOString()]),
    ),
    postOf: row.post_of,
    postLeads: row.post_leads,
    theyHave: row.they_have,
    theyWant: row.they_want,
  }));
}
