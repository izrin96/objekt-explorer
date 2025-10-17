import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod/v4";
import type { Outputs } from "@/lib/orpc/server";
import { db } from "../../db";
import { pins } from "../../db/schema";
import { authed, pub } from "../orpc";
import { checkAddressOwned } from "./profile";

export const pinsRouter = {
  list: pub.input(z.string()).handler(async ({ input: address }) => {
    const result = await db.query.pins.findMany({
      columns: {
        tokenId: true,
        createdAt: true,
      },
      where: (pins, { eq }) => eq(pins.address, address),
      orderBy: (pins, { desc }) => desc(pins.id),
    });
    return result.map((a) => ({
      tokenId: a.tokenId.toString(),
      order: a.createdAt.getTime(),
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

      await db.insert(pins).values(
        tokenIds.map((tokenId, index) => ({
          address,
          tokenId,
          createdAt: new Date(Date.now() + index),
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

      if (tokenIds.length === 0) return;

      await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));
    }),
};

export type PinListOutput = Outputs["pins"]["list"];
