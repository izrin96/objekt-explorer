import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { pins } from "@repo/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import * as z from "zod";

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
  list: pub.input(z.string()).handler(async ({ input: address }) => {
    const validPins = await getValidPins(address);
    return validPins.map((a) => ({
      tokenId: a.tokenId.toString(),
      order: a.order ?? a.id,
    }));
  }),

  batchPin: authed
    .input(
      z.object({
        address: z.string(),
        tokenIds: z.number().array(),
      }),
    )
    .handler(async ({ input: { address, tokenIds }, context: { session, locale } }) => {
      await checkAddressOwned(address, session.user.id, locale);

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
        address: z.string(),
        tokenIds: z.number().array(),
      }),
    )
    .handler(async ({ input: { address, tokenIds }, context: { session, locale } }) => {
      await checkAddressOwned(address, session.user.id, locale);

      if (tokenIds.length === 0) return;

      await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));
    }),

  movePin: authed
    .input(
      z.object({
        address: z.string(),
        tokenId: z.number(),
        direction: z.enum(["up", "down"]),
      }),
    )
    .handler(async ({ input: { address, tokenId, direction }, context: { session, locale } }) => {
      await checkAddressOwned(address, session.user.id, locale);

      const validPins = await getValidPins(address);

      const currentIdx = validPins.findIndex((p) => p.tokenId === tokenId);
      if (currentIdx === -1) return;

      const swapIdx = direction === "down" ? currentIdx - 1 : currentIdx + 1;
      if (swapIdx < 0 || swapIdx >= validPins.length) return;

      const current = validPins[currentIdx]!;
      const adjacent = validPins[swapIdx]!;

      await db.transaction(async (tx) => {
        await tx
          .update(pins)
          .set({ order: adjacent.order ?? adjacent.id })
          .where(eq(pins.id, current.id));
        await tx
          .update(pins)
          .set({ order: current.order ?? current.id })
          .where(eq(pins.id, adjacent.id));
      });
    }),
};
