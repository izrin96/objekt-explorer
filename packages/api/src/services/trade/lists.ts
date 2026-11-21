import { lists, tradePost } from "@repo/db/schema";
import { type SQL, and, eq, inArray, or, sql } from "drizzle-orm";

import { column, offersSwapsSql, onTradeRowsSql } from "../../lib/trade-sql";
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
 * same owner's want list, with `lead` offering swaps. The one pairing rule `postsCte` and match
 * candidates share. The caller joins `trade_post` as `post` itself, so the pairing stays a plain
 * equality the planner can hash.
 */
export const postPairsSql = (post: string, lead: string, want: string) =>
  sql`(${column(post, "lead_list_id")} = ${column(lead, "id")}
    AND ${column(post, "want_list_id")} = ${column(want, "id")}
    AND ${column(want, "list_type")} = 'want'
    AND ${column(lead, "user_id")} = ${column(want, "user_id")}
    AND ${offersSwapsSql(lead)})`;

/**
 * The other list of the `trade_post` row the list `alias` is in, or null: a lead's want list, a
 * want list's lead. It carries no other condition. The
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

/**
 * `viewer`'s hides whose row holds the list `alias`, as `hp`, from FROM onwards: the lists of a
 * hidden row, read from the list's end, for `unhidePost`, which names a list. A read about posts
 * takes the row form, `hiddenRowsSql` (lib/trade-sql.ts).
 */
export const hidesOfSql = (viewer: UserRef, alias: string) =>
  sql`FROM hidden_trade_post hp
    JOIN trade_post hide_row ON hide_row.id = hp.post_id
    WHERE hp.user_id = ${ref(viewer)}
      AND ${column(alias, "id")} IN (hide_row.lead_list_id, hide_row.want_list_id)`;

/** A `trade_post` row's columns as `PostRow` (lib/trade-posts.ts) holds them. */
export const postRowColumns = {
  id: tradePost.id,
  leadListId: tradePost.leadListId,
  wantListId: tradePost.wantListId,
  leadOnTrade: tradePost.leadOnTrade,
  wantOnTrade: tradePost.wantOnTrade,
  leadBumpedAt: tradePost.leadBumpedAt,
  wantBumpedAt: tradePost.wantBumpedAt,
  matchHave: tradePost.matchHave,
  matchSale: tradePost.matchSale,
  takesSwaps: tradePost.takesSwaps,
};

/** {@link matchableList} over a raw `lists` row, aliased or not. */
export const matchableListSql = (alias?: string) =>
  sql`(${column(alias, "list_type")} = 'want' OR ${boundOfferListSql(alias)})`;

/**
 * Each matchable list side on Trade in a `trade_post` row, with the post's Trade state, bump and
 * Open to (`onTradeRowsSql`): the body of `postsCte`'s `on_trade`, and the lists a read that
 * matches against posts takes through it.
 */
export const onTradeSql = onTradeRowsSql(matchableListSql("l"));

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
