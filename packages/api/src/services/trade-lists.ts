import { lists } from "@repo/db/schema";
import { type SQL, and, eq, inArray, or, sql } from "drizzle-orm";

import { notBlockedEither, notTradeSanctioned, ref, type UserRef } from "./safety";

/**
 * Which lists Trade uses. Want lists always take part; have and sale lists offer their
 * objekts only while bound to a Cosmo profile, never everything a wallet holds.
 */
export const offersOnTrade = and(
  inArray(lists.listType, ["have", "sale"]),
  eq(lists.isProfileBind, true),
) as SQL;

export const takesPartInTrade = or(eq(lists.listType, "want"), offersOnTrade) as SQL;

/** A have or sale list put on Trade, idle or not: what an offer may ask another member for. */
export const askableOnTrade = and(offersOnTrade, eq(lists.discoverable, true)) as SQL;

const column = (alias: string | undefined, name: string) =>
  sql.raw(alias ? `${alias}.${name}` : name);

/** {@link offersOnTrade} over a raw `lists` row, aliased or not. */
export const offersOnTradeSql = (alias?: string) =>
  sql`(${column(alias, "list_type")} IN ('have', 'sale') AND ${column(alias, "is_profile_bind")})`;

/**
 * Whether a list's objekts can be swapped for: a have list, or a sale list that takes swaps. The
 * SQL twin of `offersSwaps` (schemas/open-to.ts); the row needs `list_type` and `takes_swaps`.
 */
export const offersSwapsSql = (alias?: string) =>
  sql`(${column(alias, "list_type")} = 'have' OR (${column(alias, "list_type")} = 'sale' AND ${column(alias, "takes_swaps")}))`;

/**
 * Whether a have or sale list's entry can match a want list's: a list offering swaps matches a
 * want list open to swaps, a sale list one open to buying. `want` names a row with `match_have`
 * and `match_sale` columns.
 */
export const offerMatchesWantSql = (offer: string, want: string) =>
  sql`((${offersSwapsSql(offer)} AND ${column(want, "match_have")}) OR (${column(offer, "list_type")} = 'sale' AND ${column(want, "match_sale")}))`;

/** {@link takesPartInTrade} over a raw `lists` row, aliased or not. */
export const takesPartInTradeSql = (alias?: string) =>
  sql`(${column(alias, "list_type")} = 'want' OR ${offersOnTradeSql(alias)})`;

/**
 * Whether `viewer` sees `partner`'s lists on Trade: not hidden by the viewer, no block either
 * way, no trade block on the partner. For you and want-list alerts both apply it.
 */
export const tradePartnerSql = (viewer: UserRef, partner: UserRef) =>
  sql`(NOT EXISTS (
      SELECT 1 FROM hidden_trade_partner h
      WHERE h.user_id = ${ref(viewer)} AND h.hidden_user_id = ${ref(partner)}
    )
    AND ${notBlockedEither(viewer, partner)}
    AND ${notTradeSanctioned(partner)})`;
