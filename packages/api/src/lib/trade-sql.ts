import { type SQL, sql } from "drizzle-orm";

import { type OpenTo } from "../schemas/open-to";
import { type PostTag } from "../schemas/trade-post";

export const column = (alias: string | undefined, name: string) =>
  sql.raw(alias ? `${alias}.${name}` : name);

/**
 * Whether a list's objekts can be swapped for: a have list, or a sale list that takes swaps. The
 * SQL twin of `offersSwaps` (schemas/open-to.ts), locked to it by `trade-sql.test.ts`; the row needs
 * `list_type` and `takes_swaps`.
 */
export const offersSwapsSql = (alias?: string) =>
  sql`(${column(alias, "list_type")} = 'have' OR (${column(alias, "list_type")} = 'sale' AND ${column(alias, "takes_swaps")}))`;

/**
 * The SQL twin of `tagsOf` (schemas/trade-post.ts): WTT for a have list, a sale list that takes
 * swaps or a want list alone open to swaps, WTB for a want side open to buying (a want list
 * alone, or a have list's partner on Trade), WTS for a sale list. `wtt` reads no partner column,
 * since `excludeWttOf` negates it. `trade-sql.test.ts` locks it to `tagsOf`.
 */
export const TAG_WHERE: Record<PostTag, SQL> = {
  wtt: sql`(posts.type = 'have' OR (posts.type = 'sale' AND posts.takes_swaps) OR (posts.type = 'want' AND posts.match_have))`,
  wtb: sql`(
    (posts.type = 'want' AND (posts.match_sale OR NOT posts.match_have))
    OR (posts.type IN ('have', 'sale') AND posts.partner_id IS NOT NULL
      AND (coalesce(posts.partner_match_sale, false) OR NOT coalesce(posts.partner_match_have, true)))
  )`,
  wts: sql`posts.type = 'sale'`,
};

/** The SQL twin of `pickByOpenTo` (schemas/open-to.ts), over a row with `match_have` and `match_sale`; `trade-sql.test.ts` locks them together. */
export const byOpenToSql = (alias: string, byOpenTo: Record<OpenTo, SQL>) => sql`CASE
  WHEN NOT ${column(alias, "match_have")} THEN ${byOpenTo.buying}
  WHEN ${column(alias, "match_sale")} THEN ${byOpenTo.both}
  ELSE ${byOpenTo.swaps}
END`;

/** The SQL twin of `postRowOf` (lib/trade-post-rows.ts), which changes with it; `trade-sql.test.ts` pins the text. */
export const postRowSql = (alias: string) =>
  sql<
    number | null
  >`coalesce((SELECT min(post_row.id) FROM trade_post post_row WHERE post_row.lead_list_id = ${column(alias, "id")}), (SELECT min(post_row.id) FROM trade_post post_row WHERE post_row.want_list_id = ${column(alias, "id")}))`;

/**
 * One row per list side on Trade, from the `trade_post` rows: Trade state and bump from the side,
 * a want list's Open to and a sale list's `takes_swaps` from the row (a want list in a row is
 * always its open list, and a sale list is only ever a lead), the rest from the list. The body of
 * `postsCte`'s `on_trade`; `matchable` filters `l`, the list.
 */
export const onTradeRowsSql = (matchable: SQL) => sql`SELECT l.id, l.user_id, l.list_type,
    CASE WHEN l.list_type = 'want' THEN tp.match_sale ELSE l.match_sale END AS match_sale,
    CASE WHEN l.list_type = 'want' THEN tp.match_have ELSE l.match_have END AS match_have,
    CASE WHEN l.list_type = 'sale' THEN tp.takes_swaps ELSE l.takes_swaps END AS takes_swaps,
    side.bumped_at, l.updated_at, l.created_at
  FROM trade_post tp
  CROSS JOIN LATERAL (VALUES
    (tp.lead_list_id, tp.lead_on_trade, tp.lead_bumped_at),
    (tp.want_list_id, tp.want_on_trade, tp.want_bumped_at)
  ) side(list_id, on_trade, bumped_at)
  JOIN lists l ON l.id = side.list_id
  WHERE side.on_trade AND ${matchable}`;

/**
 * A person's last bump: the latest bump of any side of their `trade_post` rows, on Trade or not,
 * so taking a post down and putting it back cannot stand in for Bump.
 */
export const personBumpSql = (userId: SQL | string) =>
  sql<
    string | null
  >`(SELECT max(greatest(tp.lead_bumped_at, tp.want_bumped_at)) FROM trade_post tp WHERE tp.user_id = ${userId})`;

/** Whether the list `alias` has a side on Trade in some `trade_post` row. */
export const sideOnTradeSql = (alias: string) =>
  sql`EXISTS (SELECT 1 FROM trade_post side_row
    WHERE (side_row.lead_list_id = ${column(alias, "id")} AND side_row.lead_on_trade)
      OR (side_row.want_list_id = ${column(alias, "id")} AND side_row.want_on_trade))`;

const POST_STATE = {
  matchHave: { own: "match_have", from: "want" },
  matchSale: { own: "match_sale", from: "want" },
  takesSwaps: { own: "takes_swaps", from: "sale" },
} as const;

/**
 * A list's value from the side of the row {@link postRowSql} names: its bump, null for a list in
 * no row; a want list's Open to and a sale list's `takes_swaps` from the row while that side is on
 * Trade, else the list's own, so a list off Trade reads as it always did, even after an off-Trade
 * `list.edit` the row has not caught up with. `onTradeSql`'s type rule, for `alias`.
 */
export function postStateSql(alias: string, field: "bumpedAt"): SQL<string | null>;
export function postStateSql(
  alias: string,
  field: "matchHave" | "matchSale" | "takesSwaps",
): SQL<boolean>;
export function postStateSql(alias: string, field: "bumpedAt" | keyof typeof POST_STATE) {
  const side = (name: string) =>
    sql.raw(
      `CASE WHEN state_row.lead_list_id = ${alias}.id THEN state_row.lead_${name} ELSE state_row.want_${name} END`,
    );
  const rule = field === "bumpedAt" ? null : POST_STATE[field];
  const value = rule
    ? sql`CASE WHEN ${column(alias, "list_type")} = '${sql.raw(rule.from)}' AND ${side("on_trade")}
        THEN state_row.${sql.raw(rule.own)} ELSE ${column(alias, rule.own)} END`
    : side("bumped_at");
  return sql`(SELECT ${value} FROM (SELECT 1) state_one
    LEFT JOIN trade_post state_row ON state_row.id = ${postRowSql(alias)})`;
}
