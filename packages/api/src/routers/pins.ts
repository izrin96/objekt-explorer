import { db } from "@repo/db";
import { pins } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { authed, pub } from "../orpc";
import { addressSchema, addressTokenIdsInputSchema } from "../schemas/common/address";
import { movePinInputSchema } from "../schemas/pins";
import { fetchPins, getValidPins } from "../services/pins";
import { assertProfileOwned } from "../services/profile";
import { TOKEN_CHUNK_SIZE } from "../services/utils";

export const pinsRouter = {
  list: pub.input(addressSchema).handler(({ input }) => fetchPins(input)),

  batchPin: authed
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds }, context: { messages, session } }) => {
      await assertProfileOwned(address, session.user.id, messages);

      if (tokenIds.length === 0) return;

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
    }),

  batchUnpin: authed
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds }, context: { messages, session } }) => {
      await assertProfileOwned(address, session.user.id, messages);

      if (tokenIds.length === 0) return;

      await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));
    }),

  movePin: authed
    .input(movePinInputSchema)
    .handler(async ({ input: { address, tokenId, direction }, context: { messages, session } }) => {
      await assertProfileOwned(address, session.user.id, messages);

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
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds }, context: { messages, session } }) => {
      await assertProfileOwned(address, session.user.id, messages);

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
    }),
};
