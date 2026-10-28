import {
  addressesByUser,
  copyKey,
  type Holdings,
  toPartnerIdentity,
} from "@repo/api/lib/trade-rank";
import { NOTIFICATION_TYPES } from "@repo/api/schemas/notification";
import { offersSwapsSql, takesPartInTradeSql } from "@repo/api/services/trade-lists";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
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
          AND ${takesPartInTradeSql("p")}
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

  const owners = unique(listRows.flatMap((list) => Array.from(addresses.get(list.userId) ?? [])));
  const holdings = await fetchHoldings(
    unique(pairs.flatMap((pair) => (pair.objektId ? [pair.objektId] : []))),
    unique(pairs.map((pair) => pair.slug)),
    owners,
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

type HoldingRow = { owner: string; key: string; transferable: boolean; token: boolean };

/** Every copy counts here, transferable or not: a wanter holding any copy is not alerted. */
async function fetchHoldings(
  tokenIds: string[],
  slugs: string[],
  owners: string[],
): Promise<Holdings> {
  const objekts = new Map<string, { owner: string; transferable: boolean }>();
  const copies = new Map<string, boolean>();
  if (tokenIds.length === 0 && owners.length === 0) return { objekts, copies };

  const result = await indexer.execute<HoldingRow>(sql`
    SELECT o.owner, c.slug AS key, bool_or(o.transferable) AS transferable, false AS token
    FROM collection c
    JOIN objekt o ON o.collection_id = c.id
    WHERE c.slug = ANY(${sql.param(slugs)}::text[]) AND o.owner = ANY(${sql.param(owners)}::text[])
    GROUP BY o.owner, c.slug
    UNION ALL
    SELECT owner, id, transferable, true FROM objekt
    WHERE id = ANY(${sql.param(tokenIds)}::varchar[])
  `);

  for (const row of result.rows) {
    const owner = row.owner.toLowerCase();
    if (row.token) objekts.set(row.key, { owner, transferable: row.transferable });
    else copies.set(copyKey(owner, row.key), row.transferable);
  }
  return { objekts, copies };
}
