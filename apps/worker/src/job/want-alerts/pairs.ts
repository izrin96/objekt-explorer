import { hiddenRowAtSql, listSideFlagsSql } from "@repo/api/lib/trade-sql";
import { notTradeSanctioned } from "@repo/api/services/moderation/safety";
import { listedPostsCte, postsCte } from "@repo/api/services/trade/feed/query";
import {
  offerMatchesWantSql,
  boundOfferListSql,
  tradePartnerSql,
} from "@repo/api/services/trade/lists";
import { db } from "@repo/db";
import { type SQL, sql } from "drizzle-orm";

import { type AlertPair, wholeEntries } from "../../lib/want-alert-match";

type PairRow = {
  entry_id: number;
  list_id: number;
  post_id: number;
  direction: "forward" | "reverse";
  offer_list_id: number;
  want_list_id: number;
  slug: string;
  objekt_id: string | null;
  hidden: boolean;
  partner_sale: boolean;
  partner_wants_swaps: boolean;
};

export type Pair = AlertPair & { entryId: number; listId: number };
/** `list` reads a list's entries together, so a list is finished before the next starts */
export type Order = "entry" | "list";

/** Pairs up to `limit`, cut back to whole entries; an entry that alone passes it is read whole. */
export async function takeWhole(where: SQL, order: Order, limit: number) {
  const cut = wholeEntries(await fetchPairs(where, order, limit + 1), limit);
  if (cut.complete || cut.oversized === null) return cut;
  return {
    complete: false,
    taken: await fetchPairs(sql`e.id = ${cut.oversized}`, "entry", null),
  } as const;
}

/**
 * Unsent pairs whose new side is an entry matching `where` on a list that is on Trade and not idle,
 * from a partner the recipient sees on For you (`tradePartnerSql`), in `order`.
 */
export async function fetchPairs(where: SQL, order: Order, limit: number | null): Promise<Pair[]> {
  const result = await db.execute<PairRow>(sql`
    WITH ${postsCte},
    ${listedPostsCte},
    -- one row per side: an entry on a list in two listed posts is read once through each
    cand AS (
      SELECT e.id, e.list_id, e.collection_slug AS slug, e.objekt_id, e.created_at, e.rule_id,
        l.post_id, l.list_type,
        l.match_sale, l.match_have, l.takes_swaps, l.user_id
      FROM list_entries e
      -- the post's Open to and takes_swaps, not the list's
      JOIN on_trade l ON l.id = e.list_id
      WHERE (l.post_id, l.id) IN (SELECT post_id, id FROM listed_posts)
        AND e.collection_slug IS NOT NULL
        AND ${where}
    ),
    -- each list's flags as a list reads them, listTradeStateSql's rule: the union of its sides on
    -- Trade, else of every side. From trade_post itself, since a recipient's list off Trade is in
    -- no on_trade row; a list in no row takes the default below. A set, so the planner hashes it
    -- once rather than running a subquery per pair, which hid the row count from the anti join
    -- below. No list join: wl is a want list, and ol reads only takes_swaps, false on any row a
    -- sale list does not lead
    list_flags AS (${listSideFlagsSql(sql`true`)}),
    pairs AS (
      SELECT c.id AS entry_id, c.list_id, c.post_id, 'forward' AS direction,
        c.list_id AS offer_list_id, w.list_id AS want_list_id, c.slug, c.objekt_id,
        c.user_id AS offer_user_id, wl.user_id AS want_user_id, c.created_at AS entry_at,
        false AS by_rule,
        -- the new entry's list is the partner's, in either direction: its post's flags
        c.list_type = 'sale' AND NOT c.takes_swaps AS partner_sale,
        c.list_type = 'want' AND c.match_have AS partner_wants_swaps
      FROM cand c
      JOIN list_entries w ON w.collection_slug = c.slug
      JOIN lists wl ON wl.id = w.list_id
      LEFT JOIN list_flags wlf ON wlf.id = wl.id
      -- the recipient's want list counts with what any of its posts allows
      CROSS JOIN LATERAL (
        SELECT coalesce(wlf.match_have, true) AS match_have,
          coalesce(wlf.match_sale, true) AS match_sale
      ) wf
      WHERE c.list_type IN ('have', 'sale')
        AND wl.list_type = 'want' AND wl.user_id <> c.user_id
        AND ${offerMatchesWantSql("c", "wf")}
      UNION ALL
      SELECT c.id, c.list_id, c.post_id, 'reverse', o.list_id, c.list_id, c.slug, o.objekt_id,
        ol.user_id, c.user_id, c.created_at, c.rule_id IS NOT NULL,
        c.list_type = 'sale' AND NOT c.takes_swaps,
        c.list_type = 'want' AND c.match_have
      FROM cand c
      JOIN list_entries o ON o.collection_slug = c.slug
      JOIN lists ol ON ol.id = o.list_id
      LEFT JOIN list_flags olfl ON olfl.id = ol.id
      -- the recipient's sale list takes swaps when any of its posts does
      CROSS JOIN LATERAL (
        SELECT ol.list_type, coalesce(olfl.takes_swaps, false) AS takes_swaps
      ) olf
      WHERE c.list_type = 'want'
        AND ${boundOfferListSql("ol")}
        AND ol.user_id <> c.user_id
        AND ${offerMatchesWantSql("olf", "c")}
    )
    SELECT p.entry_id, p.list_id, p.post_id, p.direction, p.offer_list_id, p.want_list_id, p.slug,
      p.objekt_id, hid.at IS NOT NULL AS hidden, p.partner_sale, p.partner_wants_swaps
    FROM pairs p
    -- the new entry's post is the partner's: when the recipient hid it, if they did
    CROSS JOIN LATERAL (
      SELECT ${hiddenRowAtSql(
        sql`CASE p.direction WHEN 'forward' THEN p.want_user_id ELSE p.offer_user_id END`,
        sql`p.post_id`,
      )} AS at
    ) hid
    -- the new entry's owner is the partner, seen by the recipient as For you sees them
    WHERE CASE p.direction
        WHEN 'forward' THEN ${tradePartnerSql(sql`p.want_user_id`, sql`p.offer_user_id`)}
        ELSE ${tradePartnerSql(sql`p.offer_user_id`, sql`p.want_user_id`)}
      END
      -- a hidden post stays out, unless its owner added the entry after the hide: that one brings
      -- it back. A rule's refresh also inserts entries, and those are not the owner's doing
      AND (hid.at IS NULL OR (p.entry_at > hid.at AND NOT p.by_rule))
      AND ${notTradeSanctioned(sql`p.offer_user_id`)}
      AND ${notTradeSanctioned(sql`p.want_user_id`)}
      AND NOT EXISTS (
      SELECT 1 FROM want_alert_sent s
      WHERE s.want_list_id = p.want_list_id
        AND s.source_list_id = p.offer_list_id
        AND s.collection_slug = p.slug
    )
    ORDER BY ${order === "list" ? sql`p.list_id, p.entry_id` : sql`p.entry_id`}
    ${limit === null ? sql`` : sql`LIMIT ${limit}`}
  `);

  return result.rows.map((row): Pair => ({
    entryId: row.entry_id,
    listId: row.list_id,
    postId: row.post_id,
    direction: row.direction,
    offerListId: row.offer_list_id,
    wantListId: row.want_list_id,
    slug: row.slug,
    objektId: row.objekt_id,
    hidden: row.hidden,
    partnerSale: row.partner_sale,
    partnerWantsSwaps: row.partner_wants_swaps,
  }));
}
