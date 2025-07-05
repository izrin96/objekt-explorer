import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "../../db";
import { pins } from "../../db/schema";
import { authed, pub } from "../orpc";
import { checkAddressOwned } from "./profile";

export const pinsRouter = {
  list: pub.input(z.string()).handler(async ({ input: address }) => {
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

  pin: authed
    .input(
      z.object({
        address: z.string(),
        tokenId: z.number(),
      }),
    )
    .handler(async ({ input: { address, tokenId }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      // unpin existing first then pin again
      await db.delete(pins).where(and(eq(pins.tokenId, tokenId), eq(pins.address, address)));

      await db.insert(pins).values({
        address,
        tokenId,
      });
    }),

  unpin: authed
    .input(
      z.object({
        address: z.string(),
        tokenId: z.number(),
      }),
    )
    .handler(async ({ input: { address, tokenId }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      await db.delete(pins).where(and(eq(pins.tokenId, tokenId), eq(pins.address, address)));
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

      // unpin existing first then pin again
      await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));

      await db.insert(pins).values(
        tokenIds.map((tokenId) => ({
          address,
          tokenId,
        })),
      );
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

      await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));
    }),
};
