import {
  addressesByUser,
  copyKey,
  type Holdings,
  nicknamesByAddress,
} from "@repo/api/lib/trade-rank";
import { NOTIFICATION_TYPES } from "@repo/api/schemas/notification";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { hiddenTradePartner, lists, notificationPref, user, userAddress } from "@repo/db/schema";
import { realNickname, truncateAddress } from "@repo/lib/address";
import { and, inArray, sql } from "drizzle-orm";

import { unique } from "../../lib/array";
import {
  type Alert,
  type AlertList,
  type AlertPair,
  hiddenKey,
  prefKey,
} from "../../lib/want-alert-match";

export async function loadContext(pairs: AlertPair[]) {
  const listIds = unique(pairs.flatMap((pair) => [pair.offerListId, pair.wantListId]));
  const listRows = await db
    .select({
      id: lists.id,
      userId: lists.userId,
      slug: lists.slug,
      name: lists.name,
      profileAddress: lists.profileAddress,
    })
    .from(lists)
    .where(inArray(lists.id, listIds));
  const userIds = unique(listRows.map((list) => list.userId));

  const [users, addressRows, prefRows, hiddenRows] = await Promise.all([
    db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds)),
    db
      .select({
        userId: userAddress.userId,
        address: userAddress.address,
        nickname: userAddress.nickname,
      })
      .from(userAddress)
      .where(inArray(userAddress.userId, userIds)),
    db
      .select()
      .from(notificationPref)
      .where(
        and(
          inArray(notificationPref.userId, userIds),
          inArray(notificationPref.type, [...NOTIFICATION_TYPES]),
        ),
      ),
    db.select().from(hiddenTradePartner).where(inArray(hiddenTradePartner.userId, userIds)),
  ]);

  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  const nicknameOf = nicknamesByAddress(addressRows);
  const addresses = addressesByUser(addressRows);

  const alertLists = new Map(
    listRows.map((list): [number, AlertList] => [
      list.id,
      {
        id: list.id,
        userId: list.userId,
        slug: list.slug,
        name: list.name,
        ownerName: list.profileAddress
          ? (realNickname(list.profileAddress, nicknameOf.get(list.profileAddress.toLowerCase())) ??
            truncateAddress(list.profileAddress.toLowerCase()))
          : (nameOf.get(list.userId) ?? ""),
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
    hidden: new Set(hiddenRows.map((row) => hiddenKey(row.userId, row.hiddenUserId))),
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
