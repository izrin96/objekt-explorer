import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { userAddress } from "@repo/db/schema";
import { inArray, sql } from "drizzle-orm";

import { type Holdings, copyKey } from "../../lib/trade-rank";

type AddressRow = {
  userId: string | null;
  address: string;
  nickname: string | null;
};

export function fetchAddresses(userIds: string[]): Promise<AddressRow[]> {
  if (userIds.length === 0) return Promise.resolve([]);
  return db
    .select({
      userId: userAddress.userId,
      address: userAddress.address,
      nickname: userAddress.nickname,
    })
    .from(userAddress)
    .where(inArray(userAddress.userId, userIds));
}

type HoldingRow = { owner: string; key: string; transferable: boolean; token: boolean };

/** Restricted to the matched collections, so no wallet is scanned whole. */
export async function fetchHoldings(
  tokenIds: string[],
  slugs: string[],
  owners: string[],
): Promise<Holdings> {
  const objekts = new Map<string, { owner: string; transferable: boolean }>();
  const copies = new Map<string, boolean>();
  if (tokenIds.length === 0 && (slugs.length === 0 || owners.length === 0)) {
    return { objekts, copies };
  }

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
