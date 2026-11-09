import { addressesByUser, copyPairsOf, toPartnerIdentity } from "@repo/api/lib/trade-rank";
import { NOTIFICATION_TYPES } from "@repo/api/schemas/notification";
import { offersSwapsSql, matchableListSql } from "@repo/api/services/trade/lists";
import { fetchHoldings } from "@repo/api/services/trade/matches/holdings";
import { db } from "@repo/db";
import { lists, notificationPref, user, userAddress } from "@repo/db/schema";
import { and, asc, inArray, sql } from "drizzle-orm";

import { unique } from "../../lib/array";
import { type Alert, type AlertList, type AlertPair, prefKey } from "../../lib/want-alert-match";

export async function loadContext<P extends AlertPair>(pairs: P[]) {
  const listIds = unique(pairs.flatMap((pair) => [pair.offerListId, pair.wantListId]));
  const listRows = await db
    .select({
      id: lists.id,
      userId: lists.userId,
      slug: lists.slug,
      name: lists.name,
      listType: lists.listType,
      takesSwaps: lists.takesSwaps,
      matchHave: lists.matchHave,
      profileAddress: lists.profileAddress,
      // `pickedSides`' pair, which Compare with on the alert's link compares, when both halves
      // can swap. The outer columns are qualified by hand: drizzle leaves them bare, and bare
      // they would bind to `p`
      swapPair: sql<boolean>`exists (
        SELECT 1 FROM lists p
        WHERE p.id = lists.linked_list_id AND p.user_id = lists.user_id
          AND ${matchableListSql("p")}
          AND (p.list_type = 'want') <> (lists.list_type = 'want')
          AND CASE WHEN p.list_type = 'want' THEN ${offersSwapsSql("lists")} AND p.match_have
            ELSE ${offersSwapsSql("p")} AND lists.match_have END
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
    // what judging an alert reads: whether the wanter holds any copy, and the offer's own entry
    copyPairsOf(
      pairs.flatMap((pair) => [
        {
          slug: pair.slug,
          objektId: null,
          addresses: addressesOfList.get(pair.wantListId) ?? noAddresses,
        },
        {
          slug: pair.slug,
          objektId: pair.objektId,
          addresses: addressesOfList.get(pair.offerListId) ?? noAddresses,
        },
      ]),
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
