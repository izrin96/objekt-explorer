import { db } from "@repo/db";
import { lockedObjekts } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod";

import { isAddressHiddenFromCaller } from "../../privacy.server";
import { authed, pub } from "../orpc";
import { checkAddressOwned } from "./profile";

export const lockedObjektsRouter = {
  list: pub
    .input(z.string().refine((val) => isAddress(val)))
    .handler(async ({ input: address }) => {
      if (await isAddressHiddenFromCaller(address)) return [];
      const result = await db.query.lockedObjekts.findMany({
        columns: {
          tokenId: true,
        },
        where: { address },
        orderBy: { id: "asc" },
      });
      return result.map((a) => ({
        tokenId: a.tokenId.toString(),
      }));
    }),

  batchLock: authed
    .input(
      z.object({
        address: z.string().refine((val) => isAddress(val)),
        tokenIds: z.number().array().max(50000),
      }),
    )
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await checkAddressOwned(address, session.user.id);

      if (tokenIds.length === 0) return;

      await db
        .delete(lockedObjekts)
        .where(and(inArray(lockedObjekts.tokenId, tokenIds), eq(lockedObjekts.address, address)));

      await db
        .insert(lockedObjekts)
        .values(
          tokenIds.map((tokenId) => ({
            address,
            tokenId,
          })),
        )
        .onConflictDoNothing();
    }),

  batchUnlock: authed
    .input(
      z.object({
        address: z.string().refine((val) => isAddress(val)),
        tokenIds: z.number().array().max(50000),
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
