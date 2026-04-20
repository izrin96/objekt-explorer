import { db } from "@repo/db";
import { pins } from "@repo/db/schema";
import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import * as z from "zod";

import { authed, pub } from "../orpc";
import { checkAddressOwned } from "./profile";

export const pinsRouter = {
  list: pub.input(z.string()).handler(async ({ input: address }) => {
    const result = await db
      .select({
        id: pins.id,
        tokenId: pins.tokenId,
        order: pins.order,
      })
      .from(pins)
      .where(eq(pins.address, address))
      .orderBy(asc(sql`COALESCE(${pins.order}, ${pins.id})`));
    return result.map((a) => ({
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
        .returning({ id: pins.id });

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
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

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
    .handler(async ({ input: { address, tokenId, direction }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      const sortExpr = sql`COALESCE(${pins.order}, ${pins.id})`;

      const [current] = await db
        .select()
        .from(pins)
        .where(and(eq(pins.tokenId, tokenId), eq(pins.address, address)));
      if (!current) return;

      const currentOrder = current.order ?? current.id;

      // up = swap with pin that has higher order (moves to top in descending display)
      // down = swap with pin that has lower order (moves to bottom in descending display)
      const [adjacent] = await db
        .select()
        .from(pins)
        .where(
          and(
            eq(pins.address, address),
            direction === "up" ? gt(sortExpr, currentOrder) : lt(sortExpr, currentOrder),
          ),
        )
        .orderBy(direction === "up" ? asc(sortExpr) : desc(sortExpr))
        .limit(1);

      if (!adjacent) return;

      const adjacentOrder = adjacent.order ?? adjacent.id;

      await db.transaction(async (tx) => {
        await tx.update(pins).set({ order: adjacentOrder }).where(eq(pins.id, current.id));
        await tx.update(pins).set({ order: currentOrder }).where(eq(pins.id, adjacent.id));
      });
    }),
};
