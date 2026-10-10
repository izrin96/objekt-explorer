import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { CANDIDATE_LIMIT, type Candidate } from "../../lib/trade-rank";
import type { TradeFilter } from "../../schemas/trade";
import { notBlockedEither, notTradeSanctioned } from "../safety";
import { offerMatchesWantSql, takesPartInTradeSql } from "../trade-lists";

const HAVING: Record<TradeFilter, ReturnType<typeof sql>> = {
  all: sql``,
  mutual: sql`HAVING count(*) FILTER (WHERE they_have) > 0 AND count(*) FILTER (WHERE NOT they_have) > 0`,
  they_have: sql`HAVING count(*) FILTER (WHERE they_have) > 0`,
  they_want: sql`HAVING count(*) FILTER (WHERE NOT they_have) > 0`,
};

const ORDER: Record<TradeFilter, ReturnType<typeof sql>> = {
  all: sql`least(a, b) DESC, a + b DESC`,
  mutual: sql`least(a, b) DESC, a + b DESC`,
  they_have: sql`a DESC`,
  they_want: sql`b DESC`,
};

type CandidateRow = {
  user_id: string;
  list_updated_at: Record<string, string>;
  they_have: [number, string, string | null][];
  they_want: [number, string, boolean][];
};

/**
 * Aggregated and pre-ranked in SQL, so a large want list never ships its rows to Node;
 * ownership is checked afterwards, on these candidates only.
 */
export async function fetchTradeCandidates(
  userId: string,
  sides: { haveListIds: number[]; wantListIds: number[] },
  filter: TradeFilter,
): Promise<Candidate[]> {
  const result = await db.execute<CandidateRow>(sql`
    WITH my_want AS (
      SELECT e.collection_slug, bool_or(l.match_sale) AS match_sale
      FROM list_entries e
      JOIN lists l ON l.id = e.list_id
      WHERE e.list_id = ANY(${sql.param(sides.wantListIds)}::int[]) AND e.collection_slug IS NOT NULL
      GROUP BY e.collection_slug
    ),
    my_have AS (
      SELECT e.collection_slug, bool_or(l.list_type_new = 'have') AS on_have
      FROM list_entries e
      JOIN lists l ON l.id = e.list_id
      WHERE e.list_id = ANY(${sql.param(sides.haveListIds)}::int[]) AND e.collection_slug IS NOT NULL
      GROUP BY e.collection_slug
    ),
    partner_lists AS (
      SELECT l.id, l.user_id, l.list_type_new, l.match_sale, l.updated_at FROM lists l
      WHERE l.discoverable
        AND ${takesPartInTradeSql("l")}
        AND l.user_id <> ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM hidden_trade_partner h
          WHERE h.user_id = ${userId} AND h.hidden_user_id = l.user_id
        )
        AND ${notBlockedEither(userId, sql`l.user_id`)}
        AND ${notTradeSanctioned(sql`l.user_id`)}
    ),
    matched AS (
      SELECT p.user_id, p.id AS list_id, p.updated_at, p.match_sale, true AS they_have,
        e.collection_slug, e.objekt_id
      FROM partner_lists p
      JOIN list_entries e ON e.list_id = p.id
      JOIN my_want w ON w.collection_slug = e.collection_slug
      WHERE p.list_type_new IN ('have', 'sale') AND ${offerMatchesWantSql("p", "w")}
      UNION ALL
      SELECT p.user_id, p.id, p.updated_at, p.match_sale, false, e.collection_slug, NULL
      FROM partner_lists p
      JOIN list_entries e ON e.list_id = p.id
      JOIN my_have h ON h.collection_slug = e.collection_slug
      WHERE p.list_type_new = 'want' AND (p.match_sale OR h.on_have)
    ),
    grouped AS (
      SELECT
        user_id,
        count(DISTINCT collection_slug) FILTER (WHERE they_have) AS a,
        count(DISTINCT collection_slug) FILTER (WHERE NOT they_have) AS b,
        coalesce(
          json_agg(json_build_array(list_id, collection_slug, objekt_id)) FILTER (WHERE they_have),
          '[]'
        ) AS they_have,
        coalesce(
          json_agg(DISTINCT jsonb_build_array(list_id, collection_slug, match_sale))
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
    ORDER BY ${ORDER[filter]}, updated_at DESC, user_id
    LIMIT ${CANDIDATE_LIMIT}
  `);

  return result.rows.map((row) => ({
    userId: row.user_id,
    listUpdatedAt: Object.fromEntries(
      Object.entries(row.list_updated_at).map(([id, at]) => [id, new Date(at).toISOString()]),
    ),
    theyHave: row.they_have.map(([listId, slug, objektId]) => ({ listId, slug, objektId })),
    theyWant: row.they_want.map(([listId, slug, matchSale]) => ({ listId, slug, matchSale })),
  }));
}
