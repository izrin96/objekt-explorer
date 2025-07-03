import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { authProcedure, createTRPCRouter, publicProcedure } from "@/lib/server/api/trpc";
import { db } from "../../db";
import { lockedObjekts } from "../../db/schema";
import { checkAddressOwned } from "./profile";

export const lockedObjektsRouter = createTRPCRouter({
  list: publicProcedure.input(z.string()).query(async ({ input: address }) => {
    const result = await db.query.lockedObjekts.findMany({
      columns: {
        id: true,
        tokenId: true,
      },
      where: (q, { eq }) => eq(q.address, address),
      orderBy: (q, { desc }) => desc(q.id),
    });
    return result.map((a) => ({
      tokenId: a.tokenId.toString(),
      order: a.id,
    }));
  }),

  lock: authProcedure
    .input(
      z.object({
        address: z.string(),
        tokenId: z.number(),
      }),
    )
    .mutation(async ({ input: { address, tokenId }, ctx: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      await db
        .delete(lockedObjekts)
        .where(and(eq(lockedObjekts.tokenId, tokenId), eq(lockedObjekts.address, address)));

      await db.insert(lockedObjekts).values({
        address,
        tokenId,
      });
    }),

  unlock: authProcedure
    .input(
      z.object({
        address: z.string(),
        tokenId: z.number(),
      }),
    )
    .mutation(async ({ input: { address, tokenId }, ctx: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      await db
        .delete(lockedObjekts)
        .where(and(eq(lockedObjekts.tokenId, tokenId), eq(lockedObjekts.address, address)));
    }),

  batchLock: authProcedure
    .input(
      z.object({
        address: z.string(),
        tokenIds: z.number().array(),
      }),
    )
    .mutation(async ({ input: { address, tokenIds }, ctx: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      await db
        .delete(lockedObjekts)
        .where(and(inArray(lockedObjekts.tokenId, tokenIds), eq(lockedObjekts.address, address)));

      await db.insert(lockedObjekts).values(
        tokenIds.map((tokenId) => ({
          address,
          tokenId,
        })),
      );
    }),

  batchUnlock: authProcedure
    .input(
      z.object({
        address: z.string(),
        tokenIds: z.number().array(),
      }),
    )
    .mutation(async ({ input: { address, tokenIds }, ctx: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      await db
        .delete(lockedObjekts)
        .where(and(inArray(lockedObjekts.tokenId, tokenIds), eq(lockedObjekts.address, address)));
    }),
});
