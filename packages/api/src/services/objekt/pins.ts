import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { pins } from "@repo/db/schema";
import { chunk, chunkMap } from "@repo/lib";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { TOKEN_CHUNK_SIZE } from "../../constants";

export async function getValidPins(address: string) {
  const allPins = await db
    .select({ id: pins.id, tokenId: pins.tokenId, order: pins.order })
    .from(pins)
    .where(eq(pins.address, address))
    .orderBy(asc(sql`COALESCE(${pins.order}, ${pins.id})`));

  if (allPins.length === 0) return [];

  const owned = await chunkMap(
    allPins.map((p) => String(p.tokenId)),
    TOKEN_CHUNK_SIZE,
    (batch) =>
      indexer
        .select({ id: objekts.id })
        .from(objekts)
        .where(and(inArray(objekts.id, batch), eq(objekts.owner, address.toLowerCase()))),
  );

  const ownedSet = new Set(owned.map((o) => o.id));
  return allPins.filter((p) => ownedSet.has(String(p.tokenId)));
}

export async function fetchPins(address: string) {
  const validPins = await getValidPins(address);
  return validPins.map((a) => ({
    tokenId: a.tokenId.toString(),
    order: a.order ?? a.id,
  }));
}

/** Pins `tokenIds`, already checked as held by the address. */
export async function pinTokens(address: string, tokenIds: number[]) {
  await db.transaction(async (tx) => {
    await chunk(tokenIds, TOKEN_CHUNK_SIZE, async (batch) => {
      // unpin existing first then pin again
      await tx.delete(pins).where(and(inArray(pins.tokenId, batch), eq(pins.address, address)));

      await tx
        .insert(pins)
        .values(
          batch.map((tokenId) => ({
            address,
            tokenId,
          })),
        )
        .onConflictDoNothing();
    });

    // set order = id so pins can be reordered later; the rows just inserted
    // are the ones still holding a null order
    await tx
      .update(pins)
      .set({ order: sql`${pins.id}` })
      .where(and(eq(pins.address, address), isNull(pins.order)));
  });
}

export async function unpinTokens(address: string, tokenIds: number[]) {
  await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));
}

/** Orders the address's held pins as `tokenIds` lists them; ids it does not hold are skipped. */
export async function reorderPins(address: string, tokenIds: number[]) {
  const validPins = await getValidPins(address);

  const validPinsByTokenId = new Map(validPins.map((p) => [p.tokenId, p]));
  const orderedTokenIds = tokenIds.filter((tokenId) => validPinsByTokenId.has(tokenId));

  if (orderedTokenIds.length < 2) return;

  // Fresh, strictly distinct dense order values derived purely from target
  // position — topmost input gets the biggest value. This is self-healing:
  // even if two pins previously ended up sharing an order value (e.g. from
  // a race between concurrent reorder calls), this always assigns brand-new
  // unique values instead of permuting the pre-existing (possibly tied) pool.
  const total = orderedTokenIds.length;

  const ids: number[] = [];
  const orders: number[] = [];
  for (let i = 0; i < orderedTokenIds.length; i++) {
    const pin = validPinsByTokenId.get(orderedTokenIds[i]!)!;
    const newOrder = total - i;
    if (newOrder === (pin.order ?? pin.id)) continue;
    ids.push(pin.id);
    orders.push(newOrder);
  }

  if (ids.length === 0) return;

  await db.execute(sql`
    UPDATE ${pins}
    SET "order" = v.ord
    FROM unnest(${sql.param(ids)}::int[], ${sql.param(orders)}::int[]) AS v(id, ord)
    WHERE ${pins.id} = v.id
  `);
}
