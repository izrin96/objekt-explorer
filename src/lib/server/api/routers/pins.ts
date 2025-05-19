import { z } from "zod/v4";
import {
  authProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/lib/server/api/trpc";
import { db } from "../../db";
import { pins } from "../../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { checkAddressOwned } from "./profile";

export const pinsRouter = createTRPCRouter({
  get: publicProcedure.input(z.string()).query(async ({ input: address }) => {
    const result = await db.query.pins.findMany({
      columns: {
        id: true,
        tokenId: true,
        order: true,
      },
      where: (pins, { eq }) => eq(pins.address, address),
      orderBy: (pins, { desc }) => desc(pins.id),
    });
    return result.map((a) => ({
      tokenId: a.tokenId.toString(),
      order: a.id,
    }));
  }),

  pin: authProcedure
    .input(
      z.object({
        address: z.string(),
        tokenId: z.number(),
      })
    )
    .mutation(async ({ input: { address, tokenId }, ctx: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      // unpin existing first then pin again
      await db
        .delete(pins)
        .where(and(eq(pins.tokenId, tokenId), eq(pins.address, address)));

      await db.insert(pins).values({
        address,
        tokenId,
      });
    }),

  unpin: authProcedure
    .input(
      z.object({
        address: z.string(),
        tokenId: z.number(),
      })
    )
    .mutation(async ({ input: { address, tokenId }, ctx: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      await db
        .delete(pins)
        .where(and(eq(pins.tokenId, tokenId), eq(pins.address, address)));
    }),

  batchPin: authProcedure
    .input(
      z.object({
        address: z.string(),
        tokenIds: z.number().array(),
      })
    )
    .mutation(async ({ input: { address, tokenIds }, ctx: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      // unpin existing first then pin again
      await db
        .delete(pins)
        .where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));

      await db.insert(pins).values(
        tokenIds.map((tokenId) => ({
          address,
          tokenId,
        }))
      );
    }),

  batchUnpin: authProcedure
    .input(
      z.object({
        address: z.string(),
        tokenIds: z.number().array(),
      })
    )
    .mutation(async ({ input: { address, tokenIds }, ctx: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      await db
        .delete(pins)
        .where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));
    }),
});
