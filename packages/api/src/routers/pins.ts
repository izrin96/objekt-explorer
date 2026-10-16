import { db } from "@repo/db";
import { pins } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { authed, pub } from "../orpc";
import { addressOrBareInputSchema, addressTokenIdsInputSchema } from "../schemas/common/address";
import { documented, errorResponses } from "../schemas/common/documented";
import { pinsOutputSchema } from "../schemas/pins";
import { fetchPins, getValidPins } from "../services/pins";
import { assertProfileOwned } from "../services/profile";
import { TOKEN_CHUNK_SIZE } from "../services/utils";

export const pinsRouter = {
  list: pub
    .route({
      method: "GET",
      path: "/profiles/{address}/pins",
      tags: ["Profiles"],
      summary: "A profile's pinned objekts, in display order",
      spec: errorResponses(400),
    })
    .input(addressOrBareInputSchema)
    .output(documented(pinsOutputSchema))
    .handler(({ input }) => fetchPins(input.address)),

  batchPin: authed
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await assertProfileOwned(address, session.user.id);

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
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await assertProfileOwned(address, session.user.id);

      if (tokenIds.length === 0) return;

      await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));
    }),

  reorderPins: authed
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await assertProfileOwned(address, session.user.id);

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
