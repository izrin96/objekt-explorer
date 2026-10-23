import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { CANDIDATE_LIMIT, type Candidate, type TheyWant } from "../../lib/trade-rank";
import type { TradeFilter } from "../../schemas/trade";
import { notBlockedEither, notTradeSanctioned } from "../safety";
import { listedPost, postsCte } from "../trade-feed/query";
import { offerMatchesWantSql, takesPartInTradeSql } from "../trade-lists";

const HAVING: Record<TradeFilter, ReturnType<typeof sql>> = {
  all: sql``,
  // Mutual is a swap, so only the swap counts can make it
  mutual: sql`HAVING count(*) FILTER (WHERE they_have AND trade) > 0 AND count(*) FILTER (WHERE NOT they_have AND trade) > 0`,
  they_have: sql`HAVING count(*) FILTER (WHERE they_have) > 0`,
  they_want: sql`HAVING count(*) FILTER (WHERE NOT they_have) > 0`,
};

const ORDER: Record<TradeFilter | "sum", ReturnType<typeof sql>> = {
  // `rankPartners` ranks on the swap score first, so the cut keeps the people it ranks first
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
};

type CandidateRow = {
  user_id: string;
  list_updated_at: Record<string, string>;
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
  { ownerIds, limit = CANDIDATE_LIMIT, order = filter }: CandidateOptions = {},
): Promise<Candidate[]> {
  const result = await db.execute<CandidateRow>(sql`
    WITH ${postsCte},
    -- a set, so each list is one hash lookup rather than a scan of posts
    listed AS (
      SELECT id FROM posts WHERE ${listedPost}
      UNION
      SELECT partner_id FROM posts WHERE ${listedPost} AND partner_id IS NOT NULL
    ),
    my_want AS (
      SELECT e.collection_slug, bool_or(l.match_sale) AS match_sale, bool_or(l.match_have) AS match_have
      FROM list_entries e
      JOIN lists l ON l.id = e.list_id
      WHERE e.list_id = ANY(${sql.param(sides.wantListIds)}::int[]) AND e.collection_slug IS NOT NULL
      GROUP BY e.collection_slug
    ),
    my_have AS (
      SELECT e.collection_slug, bool_or(l.list_type_new = 'have') AS on_have,
        bool_or(l.list_type_new = 'sale') AS on_sale
      FROM list_entries e
      JOIN lists l ON l.id = e.list_id
      WHERE e.list_id = ANY(${sql.param(sides.haveListIds)}::int[]) AND e.collection_slug IS NOT NULL
      GROUP BY e.collection_slug
    ),
    partner_lists AS (
      SELECT l.id, l.user_id, l.list_type_new, l.match_sale, l.match_have, l.updated_at FROM lists l
      WHERE l.discoverable
        AND ${takesPartInTradeSql("l")}
        AND l.user_id <> ${userId}
        -- an idle list does not count: a pair's lists share the pair's freshness
        AND l.id IN (SELECT id FROM listed)
        ${ownerIds ? sql`AND l.user_id = ANY(${sql.param(ownerIds)}::text[])` : sql``}
        AND NOT EXISTS (
          SELECT 1 FROM hidden_trade_partner h
          WHERE h.user_id = ${userId} AND h.hidden_user_id = l.user_id
        )
        AND ${notBlockedEither(userId, sql`l.user_id`)}
        AND ${notTradeSanctioned(sql`l.user_id`)}
    ),
    matched AS (
      SELECT p.user_id, p.id AS list_id, p.updated_at, p.match_sale, p.match_have, true AS they_have,
        p.list_type_new = 'have' AS trade, e.collection_slug, e.objekt_id
      FROM partner_lists p
      JOIN list_entries e ON e.list_id = p.id
      JOIN my_want w ON w.collection_slug = e.collection_slug
      WHERE p.list_type_new IN ('have', 'sale') AND ${offerMatchesWantSql("p", "w")}
      UNION ALL
      SELECT p.user_id, p.id, p.updated_at, p.match_sale, p.match_have, false,
        p.match_have AND h.on_have, e.collection_slug, NULL
      FROM partner_lists p
      JOIN list_entries e ON e.list_id = p.id
      JOIN my_have h ON h.collection_slug = e.collection_slug
      WHERE p.list_type_new = 'want' AND ((p.match_have AND h.on_have) OR (p.match_sale AND h.on_sale))
    ),
    grouped AS (
      SELECT
        user_id,
        count(DISTINCT collection_slug) FILTER (WHERE they_have) AS a,
        count(DISTINCT collection_slug) FILTER (WHERE NOT they_have) AS b,
        count(DISTINCT collection_slug) FILTER (WHERE they_have AND trade) AS a_t,
        count(DISTINCT collection_slug) FILTER (WHERE NOT they_have AND trade) AS b_t,
        coalesce(
          json_agg(json_build_object(
            'listId', list_id, 'slug', collection_slug, 'objektId', objekt_id, 'sale', NOT trade
          )) FILTER (WHERE they_have),
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
    )
    SELECT user_id, list_updated_at, they_have, they_want FROM grouped
    ORDER BY ${ORDER[order]}, updated_at DESC, user_id
    LIMIT ${limit}
  `);

  return result.rows.map((row) => ({
    userId: row.user_id,
    listUpdatedAt: Object.fromEntries(
      Object.entries(row.list_updated_at).map(([id, at]) => [id, new Date(at).toISOString()]),
    ),
    theyHave: row.they_have,
    theyWant: row.they_want,
  }));
}
