import { addressesByUser, copyPairsOf, toPartnerIdentity } from "@repo/api/lib/trade-rank";
import { listTradeStateSql, sideStateSql } from "@repo/api/lib/trade-sql";
import { NOTIFICATION_TYPES } from "@repo/api/schemas/notification";
import { matchableListSql } from "@repo/api/services/trade/lists";
import { fetchHoldings } from "@repo/api/services/trade/matches/holdings";
import { db } from "@repo/db";
import { lists, notificationPref, user, userAddress } from "@repo/db/schema";
import { and, asc, inArray, sql } from "drizzle-orm";

import { unique } from "../../lib/array";
import { type Alert, type AlertList, type AlertPair, prefKey } from "../../lib/want-alert-match";

/** `offersSwapsSql` with the list's `takes_swaps` from its side in the row `r`. */
const offersSwapsBySide = (list: string) =>
  sql`(${sql.raw(list)}.list_type = 'have' OR (${sql.raw(list)}.list_type = 'sale' AND ${sideStateSql("r", list, "takesSwaps")}))`;

export async function loadContext<P extends AlertPair>(pairs: P[]) {
  const listIds = unique(pairs.flatMap((pair) => [pair.offerListId, pair.wantListId]));
  const listRows = await db
    .select({
      id: lists.id,
      userId: lists.userId,
      slug: lists.slug,
      name: lists.name,
      listType: lists.listType,
      // the recipient's list as a list: the union of its posts on Trade, else of all, else the default
      takesSwaps: listTradeStateSql("lists", "takesSwaps"),
      matchHave: listTradeStateSql("lists", "matchHave"),
      profileAddress: lists.profileAddress,
      // a pair row, as `pickedSides` pairs (opposite sides, both lists matchable), whose two
      // halves can swap: the offering half offers swaps and the want half takes them, each by its
      // side in that row. The outer columns are qualified by hand: drizzle leaves them bare, and
      // bare they would bind to `p`
      swapPair: sql<boolean>`exists (
        SELECT 1 FROM trade_post r
        JOIN lists p ON p.id = CASE WHEN r.lead_list_id = lists.id THEN r.want_list_id ELSE r.lead_list_id END
        WHERE (r.lead_list_id = lists.id OR r.want_list_id = lists.id)
          AND p.user_id = lists.user_id
          AND ${matchableListSql("p")}
          AND (p.list_type = 'want') <> (lists.list_type = 'want')
          AND CASE WHEN p.list_type = 'want'
            THEN ${offersSwapsBySide("lists")} AND ${sideStateSql("r", "p", "matchHave")}
            ELSE ${offersSwapsBySide("p")} AND ${sideStateSql("r", "lists", "matchHave")} END
      )`,
    })
    .from(lists)
    .where(inArray(lists.id, listIds));
  const userIds = unique(listRows.map((list) => list.userId));

  const [users, addressRows, prefRows] = await Promise.all([
    db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds)),
    db
      .select({
        userId: userAddress.userId,
        address: userAddress.address,
        nickname: userAddress.nickname,
        isDefault: userAddress.isDefault,
      })
      .from(userAddress)
      .where(inArray(userAddress.userId, userIds))
      // link order, so a fallback to the first linked profile matches chat
      .orderBy(sql`${userAddress.linkedAt} ASC NULLS LAST`, asc(userAddress.id)),
    db
      .select()
      .from(notificationPref)
      .where(
        and(
          inArray(notificationPref.userId, userIds),
          inArray(notificationPref.type, [...NOTIFICATION_TYPES]),
        ),
      ),
  ]);

  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  const addresses = addressesByUser(addressRows);

  const alertLists = new Map(
    listRows.map((list): [number, AlertList] => [
      list.id,
      {
        id: list.id,
        userId: list.userId,
        slug: list.slug,
        name: list.name,
        // a Sell or swap list can swap, so Can swap asks For you about it like a have list
        sale: list.listType === "sale" && !list.takesSwaps,
        swapPair: list.swapPair,
        wantsSwaps: list.listType === "want" && list.matchHave,
        ownerName: toPartnerIdentity(
          nameOf.get(list.userId) ?? "",
          [{ profileAddress: list.profileAddress, matches: 0 }],
          addressRows.filter((row) => row.userId === list.userId),
        ).name,
      },
    ]),
  );

  const addressesOfList = new Map(
    listRows.map((list) => [list.id, addresses.get(list.userId) ?? new Set<string>()]),
  );
  const noAddresses = new Set<string>();
  const holdings = await fetchHoldings(
    unique(pairs.flatMap((pair) => (pair.objektId ? [pair.objektId] : []))),
    // the offer's side only: a copy the wanter already holds never stops an alert, as on For you
    copyPairsOf(
      pairs.map((pair) => ({
        slug: pair.slug,
        objektId: pair.objektId,
        addresses: addressesOfList.get(pair.offerListId) ?? noAddresses,
      })),
    ),
  );

  return {
    pairs,
    lists: alertLists,
    addresses,
    holdings,
    prefs: new Map(
      prefRows.map((row) => [prefKey(row.userId, row.type as Alert["type"]), row.enabled]),
    ),
    matches: new Map(
      prefRows.flatMap((row) =>
        row.match === null ? [] : [[prefKey(row.userId, row.type as Alert["type"]), row.match]],
      ),
    ),
  };
}
