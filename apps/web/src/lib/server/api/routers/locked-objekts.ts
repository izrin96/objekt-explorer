import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod/v4";

import type { Outputs } from "@/lib/orpc/server";

import { db } from "../../db";
import { lockedObjekts } from "../../db/schema";
import { authed, pub } from "../orpc";
import { checkAddressOwned } from "./profile";

export const lockedObjektsRouter = {
  list: pub.input(z.string()).handler(async ({ input: address }) => {
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

  batchLock: authed
    .input(
      z.object({
        address: z.string(),
        tokenIds: z.number().array(),
      }),
    )
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      if (tokenIds.length === 0) return;

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

  batchUnlock: authed
    .input(
      z.object({
        address: z.string(),
        tokenIds: z.number().array(),
      }),
    )
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      if (tokenIds.length === 0) return;

      await db
        .delete(lockedObjekts)
        .where(and(inArray(lockedObjekts.tokenId, tokenIds), eq(lockedObjekts.address, address)));
    }),
};

export type LockListOutput = Outputs["lockedObjekt"]["list"];
