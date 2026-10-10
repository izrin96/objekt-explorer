import { lists } from "@repo/db/schema";
import { type SQL, and, eq, inArray, or, sql } from "drizzle-orm";

/**
 * Which lists Trade uses. Want lists always take part; have and sale lists offer their
 * objekts only while bound to a Cosmo profile, never everything a wallet holds.
 */
export const offersOnTrade = and(
  inArray(lists.listTypeNew, ["have", "sale"]),
  eq(lists.isProfileBind, true),
) as SQL;

export const takesPartInTrade = or(eq(lists.listTypeNew, "want"), offersOnTrade) as SQL;

const column = (alias: string | undefined, name: string) =>
  sql.raw(alias ? `${alias}.${name}` : name);

/** {@link offersOnTrade} over a raw `lists` row, aliased or not. */
export const offersOnTradeSql = (alias?: string) =>
  sql`(${column(alias, "list_type_new")} IN ('have', 'sale') AND ${column(alias, "is_profile_bind")})`;

/**
 * Whether a have or sale list's entry can match a want list's: a sale list only matches a want
 * list that takes sales. `want` names a row with a `match_sale` column.
 */
export const offerMatchesWantSql = (offer: string, want: string) =>
  sql`(${column(offer, "list_type_new")} = 'have' OR ${column(want, "match_sale")})`;

/** {@link takesPartInTrade} over a raw `lists` row, aliased or not. */
export const takesPartInTradeSql = (alias?: string) =>
  sql`(${column(alias, "list_type_new")} = 'want' OR ${offersOnTradeSql(alias)})`;
