import { lists } from "@repo/db/schema";
import { type SQL, and, eq, inArray, or, sql } from "drizzle-orm";

/**
 * Which lists Trade uses. Want lists always take part; have and sale lists offer their
 * objekts only while bound to a Cosmo profile, never everything a wallet holds.
 */
export const offersOnTrade = and(
  inArray(lists.listType, ["have", "sale"]),
  eq(lists.isProfileBind, true),
) as SQL;

export const takesPartInTrade = or(eq(lists.listType, "want"), offersOnTrade) as SQL;

const column = (alias: string | undefined, name: string) =>
  sql.raw(alias ? `${alias}.${name}` : name);

/** {@link offersOnTrade} over a raw `lists` row, aliased or not. */
export const offersOnTradeSql = (alias?: string) =>
  sql`(${column(alias, "list_type")} IN ('have', 'sale') AND ${column(alias, "is_profile_bind")})`;

/**
 * Whether a have or sale list's entry can match a want list's: a have list only matches a want
 * list open to swaps, a sale list only one open to buying. `want` names a row with `match_have`
 * and `match_sale` columns.
 */
export const offerMatchesWantSql = (offer: string, want: string) =>
  sql`((${column(offer, "list_type")} = 'have' AND ${column(want, "match_have")}) OR (${column(offer, "list_type")} = 'sale' AND ${column(want, "match_sale")}))`;

/** {@link takesPartInTrade} over a raw `lists` row, aliased or not. */
export const takesPartInTradeSql = (alias?: string) =>
  sql`(${column(alias, "list_type")} = 'want' OR ${offersOnTradeSql(alias)})`;
