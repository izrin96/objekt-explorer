import { z } from "zod";
import {
  authProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/lib/server/api/trpc";
import { db } from "../../db";
import { pins } from "../../db/schema";
import { and, eq } from "drizzle-orm";
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
});
