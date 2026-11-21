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
 * always its open list, and a sale list is only ever a lead), the rest from the list, with the
 * row as `post_id` and the side (`lead` or `want`). The body of `postsCte`'s `on_trade`;
 * `matchable` filters `l`, the list.
 */
export const onTradeRowsSql = (matchable: SQL) => sql`SELECT l.id, l.user_id, l.list_type,
    CASE WHEN l.list_type = 'want' THEN tp.match_sale ELSE l.match_sale END AS match_sale,
    CASE WHEN l.list_type = 'want' THEN tp.match_have ELSE l.match_have END AS match_have,
    CASE WHEN l.list_type = 'sale' THEN tp.takes_swaps ELSE l.takes_swaps END AS takes_swaps,
    side.bumped_at, l.updated_at, l.created_at, tp.id AS post_id, side.side
  FROM trade_post tp
  CROSS JOIN LATERAL (VALUES
    (tp.lead_list_id, tp.lead_on_trade, tp.lead_bumped_at, 'lead'),
    (tp.want_list_id, tp.want_on_trade, tp.want_bumped_at, 'want')
  ) side(list_id, on_trade, bumped_at, side)
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
 * The list `list`'s side in the `trade_post` row `row`: its Trade state and bump; a want list's
 * Open to and a sale list's `takes_swaps` from the row while that side is on Trade, else the
 * list's own. The SQL twin of `sideStateOf` (lib/trade-posts.ts), locked to it by
 * `trade-sql.test.ts`.
 */
export function sideStateSql(row: string, list: string, field: "onTrade"): SQL<boolean>;
export function sideStateSql(row: string, list: string, field: "bumpedAt"): SQL<string | null>;
export function sideStateSql(
  row: string,
  list: string,
  field: "matchHave" | "matchSale" | "takesSwaps",
): SQL<boolean>;
export function sideStateSql(
  row: string,
  list: string,
  field: "onTrade" | "bumpedAt" | keyof typeof POST_STATE,
) {
  const side = (name: string) =>
    sql.raw(
      `CASE WHEN ${row}.lead_list_id = ${list}.id THEN ${row}.lead_${name} ELSE ${row}.want_${name} END`,
    );
  if (field === "onTrade") return sql`(${side("on_trade")})`;
  if (field === "bumpedAt") return sql`(${side("bumped_at")})`;
  const rule = POST_STATE[field];
  return sql`(CASE WHEN ${column(list, "list_type")} = '${sql.raw(rule.from)}' AND ${side("on_trade")}
    THEN ${column(row, rule.own)} ELSE ${column(list, rule.own)} END)`;
}

/** The `trade_post` rows, as `st`, in which the list `alias` has a side on Trade. */
const onTradeSidesOf = (alias: string) =>
  sql`FROM trade_post st
    WHERE (st.lead_list_id = ${column(alias, "id")} AND st.lead_on_trade)
      OR (st.want_list_id = ${column(alias, "id")} AND st.want_on_trade)`;

/**
 * A list's value as a read that names only the list takes it: the union of its sides on Trade
 * (any post that allows it), else the list's own; a want list's Open to and a sale list's
 * `takes_swaps` by `onTradeSql`'s type rule, the list's own for every other list. Its bump is the
 * latest of its sides on Trade, else null. A shared list holds the same entries in every post, so
 * a match exists exactly when one of its posts allows it.
 */
export function listTradeStateSql(alias: string, field: "bumpedAt"): SQL<string | null>;
export function listTradeStateSql(
  alias: string,
  field: "matchHave" | "matchSale" | "takesSwaps",
): SQL<boolean>;
export function listTradeStateSql(alias: string, field: "bumpedAt" | keyof typeof POST_STATE) {
  if (field === "bumpedAt") {
    return sql`(SELECT max(CASE WHEN st.lead_list_id = ${column(alias, "id")} THEN st.lead_bumped_at ELSE st.want_bumped_at END) ${onTradeSidesOf(alias)})`;
  }
  const rule = POST_STATE[field];
  const own = column(alias, rule.own);
  return sql`(CASE WHEN ${column(alias, "list_type")} = '${sql.raw(rule.from)}'
    THEN coalesce((SELECT bool_or(st.${sql.raw(rule.own)}) ${onTradeSidesOf(alias)}), ${own})
    ELSE ${own} END)`;
}

/**
 * The post a read keyed by a list shows: the lowest row whose side holding the list is on Trade,
 * else {@link postRowSql}'s row. With one row per list the two name the same row.
 */
export const listPostSql = (alias: string) =>
  sql<number | null>`coalesce((SELECT min(st.id) ${onTradeSidesOf(alias)}), ${postRowSql(alias)})`;

/**
 * The `trade_post` rows `viewer` hid, as `post_id`: a set the planner builds once and hashes, read
 * through the hide's primary key. A post is hidden when its row is in it.
 */
export const hiddenRowsSql = (viewer: SQL | string) =>
  sql`SELECT hidden_row.post_id FROM hidden_trade_post hidden_row WHERE hidden_row.user_id = ${viewer}`;

/** When `viewer` hid the `trade_post` row `row`, or null when they did not. */
export const hiddenRowAtSql = (viewer: SQL | string, row: SQL) =>
  sql<
    string | null
  >`(SELECT hidden_row.created_at FROM hidden_trade_post hidden_row WHERE hidden_row.user_id = ${viewer} AND hidden_row.post_id = ${row})`;
