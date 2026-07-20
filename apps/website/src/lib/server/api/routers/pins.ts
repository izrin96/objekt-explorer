import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { pins } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import * as z from "zod";

import { isAddressHiddenFromCaller } from "../../privacy.server";
import { authed, pub } from "../orpc";
import { checkAddressOwned } from "./profile";

async function getValidPins(address: string) {
  const allPins = await db
    .select({ id: pins.id, tokenId: pins.tokenId, order: pins.order })
    .from(pins)
    .where(eq(pins.address, address))
    .orderBy(asc(sql`COALESCE(${pins.order}, ${pins.id})`));

  if (allPins.length === 0) return [];

  const owned = await indexer
    .select({ id: objekts.id })
    .from(objekts)
    .where(
      and(
        inArray(
          objekts.id,
          allPins.map((p) => String(p.tokenId)),
        ),
        eq(objekts.owner, address.toLowerCase()),
      ),
    );

  const ownedSet = new Set(owned.map((o) => o.id));
  return allPins.filter((p) => ownedSet.has(String(p.tokenId)));
}

export const pinsRouter = {
  list: pub
    .input(z.string().refine((val) => isAddress(val)))
    .handler(async ({ input: address }) => {
      if (await isAddressHiddenFromCaller(address)) return [];
      const validPins = await getValidPins(address);
      return validPins.map((a) => ({
        tokenId: a.tokenId.toString(),
        order: a.order ?? a.id,
      }));
    }),

  batchPin: authed
    .input(
      z.object({
        address: z.string().refine((val) => isAddress(val)),
        tokenIds: z.number().array().max(50000),
      }),
    )
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      if (tokenIds.length === 0) return;

      // unpin existing first then pin again
      await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));

      const inserted = await db
        .insert(pins)
        .values(
          tokenIds.map((tokenId) => ({
            address,
            tokenId,
          })),
        )
        .returning({ id: pins.id })
        .onConflictDoNothing();

      // set order = id so pins can be reordered later
      for (const row of inserted) {
        await db.update(pins).set({ order: row.id }).where(eq(pins.id, row.id));
      }
    }),

  batchUnpin: authed
    .input(
      z.object({
        address: z.string().refine((val) => isAddress(val)),
        tokenIds: z.number().array().max(50000),
      }),
    )
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      if (tokenIds.length === 0) return;

      await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));
    }),

  movePin: authed
    .input(
      z.object({
        address: z.string().refine((val) => isAddress(val)),
        tokenId: z.number(),
        direction: z.enum(["up", "down"]),
      }),
    )
    .handler(async ({ input: { address, tokenId, direction }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      const validPins = await getValidPins(address);

      const currentIdx = validPins.findIndex((p) => p.tokenId === tokenId);
      if (currentIdx === -1) return;

      const swapIdx = direction === "down" ? currentIdx - 1 : currentIdx + 1;
      if (swapIdx < 0 || swapIdx >= validPins.length) return;

      const current = validPins[currentIdx]!;
      const adjacent = validPins[swapIdx]!;

      // Assign brand-new order values derived purely from each row's target
      // position (rank) in validPins, not from the old captured
      // current.order/adjacent.order values. validPins is ascending by
      // COALESCE(order, id), so index i maps to order value i + 1 (bigger =
      // topmost). This mirrors reorderPins: even if current and adjacent
      // happened to share the same order value (a tie), swapping their
      // positions always produces two distinct values, so the tie cannot
      // survive.
      await db.transaction(async (tx) => {
        await tx
          .update(pins)
          .set({ order: swapIdx + 1 })
          .where(eq(pins.id, current.id));
        await tx
          .update(pins)
          .set({ order: currentIdx + 1 })
          .where(eq(pins.id, adjacent.id));
      });
    }),

  reorderPins: authed
    .input(
      z.object({
        address: z.string().refine((val) => isAddress(val)),
        tokenIds: z.number().array().max(50000),
      }),
    )
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

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

      await db.transaction(async (tx) => {
        for (let i = 0; i < orderedTokenIds.length; i++) {
          const pin = validPinsByTokenId.get(orderedTokenIds[i]!)!;
          const newOrder = total - i;
          if (newOrder === (pin.order ?? pin.id)) continue;
          await tx.update(pins).set({ order: newOrder }).where(eq(pins.id, pin.id));
        }
      });
    }),
};
