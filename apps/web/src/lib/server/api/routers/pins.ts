import { db } from "@repo/db";
import { pins } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod";

import type { Outputs } from "@/lib/orpc/server";

import { authed, pub } from "../orpc";
import { checkAddressOwned } from "./profile";

export const pinsRouter = {
  list: pub.input(z.string()).handler(async ({ input: address }) => {
    const result = await db.query.pins.findMany({
      columns: {
        tokenId: true,
      },
      where: { address },
      orderBy: { id: "asc" },
    });
    return result.map((a, index) => ({
      tokenId: a.tokenId.toString(),
      order: index + 1,
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

      if (tokenIds.length === 0) return;

      await db.delete(pins).where(and(inArray(pins.tokenId, tokenIds), eq(pins.address, address)));
    }),
};

export type PinListOutput = Outputs["pins"]["list"];
