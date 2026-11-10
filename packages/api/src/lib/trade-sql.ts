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
