import { notBlockedEither, notTradeSanctioned } from "@repo/api/services/safety";
import {
  offerMatchesWantSql,
  offersOnTradeSql,
  takesPartInTradeSql,
} from "@repo/api/services/trade-lists";
import { db } from "@repo/db";
import { type SQL, sql } from "drizzle-orm";

import { type AlertPair, wholeEntries } from "../../lib/want-alert-match";

type PairRow = {
  entry_id: number;
  list_id: number;
  direction: "forward" | "reverse";
  offer_list_id: number;
  want_list_id: number;
  slug: string;
  objekt_id: string | null;
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

/** Unsent pairs whose new side is a discoverable list's entry matching `where`, in `order`. */
export async function fetchPairs(where: SQL, order: Order, limit: number | null): Promise<Pair[]> {
  const result = await db.execute<PairRow>(sql`
    WITH cand AS (
      SELECT e.id, e.list_id, e.collection_slug AS slug, e.objekt_id, l.list_type_new,
        l.match_sale, l.user_id
      FROM list_entries e
      JOIN lists l ON l.id = e.list_id
      WHERE l.discoverable
        AND ${takesPartInTradeSql("l")}
        AND e.collection_slug IS NOT NULL
        AND ${where}
    ),
    pairs AS (
      SELECT c.id AS entry_id, c.list_id, 'forward' AS direction, c.list_id AS offer_list_id,
        w.list_id AS want_list_id, c.slug, c.objekt_id,
        c.user_id AS offer_user_id, wl.user_id AS want_user_id
      FROM cand c
      JOIN list_entries w ON w.collection_slug = c.slug
      JOIN lists wl ON wl.id = w.list_id
      WHERE c.list_type_new IN ('have', 'sale')
        AND ${offerMatchesWantSql("c", "wl")}
        AND wl.list_type_new = 'want' AND wl.user_id <> c.user_id
      UNION ALL
      SELECT c.id, c.list_id, 'reverse', o.list_id, c.list_id, c.slug, o.objekt_id, ol.user_id, c.user_id
      FROM cand c
      JOIN list_entries o ON o.collection_slug = c.slug
      JOIN lists ol ON ol.id = o.list_id
      WHERE c.list_type_new = 'want'
        AND ${offersOnTradeSql("ol")}
        AND ${offerMatchesWantSql("ol", "c")}
        AND ol.user_id <> c.user_id
    )
    SELECT entry_id, list_id, direction, offer_list_id, want_list_id, slug, objekt_id FROM pairs p
    WHERE ${notBlockedEither(sql`p.want_user_id`, sql`p.offer_user_id`)}
      AND ${notTradeSanctioned(sql`p.offer_user_id`)}
      AND ${notTradeSanctioned(sql`p.want_user_id`)}
      AND NOT EXISTS (
      SELECT 1 FROM want_alert_sent s
      WHERE s.want_list_id = p.want_list_id
        AND s.source_list_id = p.offer_list_id
        AND s.collection_slug = p.slug
    )
    ORDER BY ${order === "list" ? sql`list_id, entry_id` : sql`entry_id`}
    ${limit === null ? sql`` : sql`LIMIT ${limit}`}
  `);

  return result.rows.map((row): Pair => ({
    entryId: row.entry_id,
    listId: row.list_id,
    direction: row.direction,
    offerListId: row.offer_list_id,
    wantListId: row.want_list_id,
    slug: row.slug,
    objektId: row.objekt_id,
  }));
}
