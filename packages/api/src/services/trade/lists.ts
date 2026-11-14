import { lists } from "@repo/db/schema";
import { type SQL, and, eq, inArray, or, sql } from "drizzle-orm";

import { column, offersSwapsSql } from "../../lib/trade-sql";
import { notBlockedEither, notTradeSanctioned, ref, type UserRef } from "../moderation/safety";

/**
 * Which lists Trade uses. Want lists always take part; have and sale lists offer their
 * objekts only while bound to a Cosmo profile, never everything a wallet holds. Neither check
 * asks whether the list is on Trade (`discoverable`): a user's own lists match without it.
 */
export const boundOfferList = and(
  inArray(lists.listType, ["have", "sale"]),
  eq(lists.isProfileBind, true),
) as SQL;

export const matchableList = or(eq(lists.listType, "want"), boundOfferList) as SQL;

/** A have or sale list put on Trade, idle or not: what an offer may ask another member for. */
export const askableOnTrade = and(boundOfferList, eq(lists.discoverable, true)) as SQL;

/** {@link boundOfferList} over a raw `lists` row, aliased or not. */
export const boundOfferListSql = (alias?: string) =>
  sql`(${column(alias, "list_type")} IN ('have', 'sale') AND ${column(alias, "is_profile_bind")})`;

/**
 * Whether a have or sale list's entry can match a want list's: a list offering swaps matches a
 * want list open to swaps, a sale list one open to buying. `want` names a row with `match_have`
 * and `match_sale` columns.
 */
export const offerMatchesWantSql = (offer: string, want: string) =>
  sql`((${offersSwapsSql(offer)} AND ${column(want, "match_have")}) OR (${column(offer, "list_type")} = 'sale' AND ${column(want, "match_sale")}))`;

/**
 * Whether the `trade_post` row `post` pairs `lead` with the want list `want` as one post: the
 * same owner's want list, with `lead` offering swaps. The one pairing rule `postsCte`, match
 * candidates and hidden posts share. The caller joins `trade_post` as `post` itself, so the
 * pairing stays a plain equality the planner can hash.
 */
export const postPairsSql = (post: string, lead: string, want: string) =>
  sql`(${column(post, "lead_list_id")} = ${column(lead, "id")}
    AND ${column(post, "want_list_id")} = ${column(want, "id")}
    AND ${column(want, "list_type")} = 'want'
    AND ${column(lead, "user_id")} = ${column(want, "user_id")}
    AND ${offersSwapsSql(lead)})`;

/**
 * The other list of the `trade_post` row the list `alias` is in, or null: a lead's want list, a
 * want list's lead. It carries no other condition, as `lists.linked_list_id` carried none. The
 * lowest row id answers, as `planPostRows` keeps it, so a list in two rows gives one partner
 * rather than an error.
 */
export const postPartnerSql = (alias: string) =>
  sql<number | null>`coalesce(
    (SELECT partner_row.want_list_id FROM trade_post partner_row
      WHERE partner_row.lead_list_id = ${column(alias, "id")} ORDER BY partner_row.id LIMIT 1),
    (SELECT partner_row.lead_list_id FROM trade_post partner_row
      WHERE partner_row.want_list_id = ${column(alias, "id")} ORDER BY partner_row.id LIMIT 1)
  )`;

/** `viewer`'s hides of the post the list `alias` belongs to, as `hp`, from FROM onwards. */
export const hidesOfSql = (viewer: UserRef, alias: string) =>
  sql`FROM hidden_trade_post hp
    WHERE hp.user_id = ${ref(viewer)}
      AND (hp.list_id = ${column(alias, "id")}
        OR hp.list_id IN (
          SELECT hide_lead.id FROM trade_post hide_row
          JOIN lists hide_lead ON hide_lead.id = hide_row.lead_list_id
          WHERE ${postPairsSql("hide_row", "hide_lead", alias)}))`;

/**
 * Whether the list `alias` belongs to a post `viewer` hid: the hide names the post's lead, so a
 * want half is found through the row pairing it with its lead, on Trade or off.
 */
export const inHiddenPostSql = (viewer: UserRef, alias: string) =>
  sql`EXISTS (SELECT 1 ${hidesOfSql(viewer, alias)})`;

/** When `viewer` last hid the post the list `alias` belongs to, or null when it is not hidden. */
export const hiddenPostAtSql = (viewer: UserRef, alias: string) =>
  sql`(SELECT max(hp.created_at) ${hidesOfSql(viewer, alias)})`;

/** {@link matchableList} over a raw `lists` row, aliased or not. */
export const matchableListSql = (alias?: string) =>
  sql`(${column(alias, "list_type")} = 'want' OR ${boundOfferListSql(alias)})`;

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
