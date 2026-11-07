import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { userAddress } from "@repo/db/schema";
import { asc, inArray, sql } from "drizzle-orm";

import { type CopyPair, type Holdings, copyKey } from "../../../lib/trade-rank";

type AddressRow = {
  userId: string | null;
  address: string;
  nickname: string | null;
  isDefault: boolean;
};

export function fetchAddresses(userIds: string[]): Promise<AddressRow[]> {
  if (userIds.length === 0) return Promise.resolve([]);
  return (
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
      .orderBy(sql`${userAddress.linkedAt} ASC NULLS LAST`, asc(userAddress.id))
  );
}

type HoldingRow = { owner: string; key: string; transferable: boolean; token: boolean };

/**
 * The copies of exactly these (address, collection) pairs (`copyPairsOf`), and these tokens' owners. Asking for
 * every collection at every address instead reads every copy the addresses hold: on want-list
 * sizes that was 5 s and 28,711 rows for the 170 that were needed, against 0.13 s by pair.
 */
export async function fetchHoldings(
  tokenIds: string[],
  pairs: readonly CopyPair[],
): Promise<Holdings> {
  const objekts = new Map<string, { owner: string; transferable: boolean }>();
  const copies = new Map<string, boolean>();
  if (tokenIds.length === 0 && pairs.length === 0) return { objekts, copies };

  const result = await indexer.execute<HoldingRow>(sql`
    SELECT p.owner, p.slug AS key, bool_or(o.transferable) AS transferable, false AS token
    FROM unnest(
      ${sql.param(pairs.map((pair) => pair.owner))}::text[],
      ${sql.param(pairs.map((pair) => pair.slug))}::text[]
    ) AS p(owner, slug)
    JOIN collection c ON c.slug = p.slug
    JOIN objekt o ON o.owner = p.owner AND o.collection_id = c.id
    GROUP BY p.owner, p.slug
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
