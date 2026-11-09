import { db } from "@repo/db";
import { lockedObjekts } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import { and, eq, inArray } from "drizzle-orm";

import { TOKEN_CHUNK_SIZE } from "../constants";
import { authed, pub } from "../orpc";
import { addressOrBareInputSchema, addressTokenIdsInputSchema } from "../schemas/common/address";
import { documented, errorResponses } from "../schemas/common/documented";
import { lockedObjektsOutputSchema } from "../schemas/locked-objekts";
import { fetchLockedObjekts } from "../services/objekt/locked";
import { ownedTokenIds } from "../services/objekt/owned";
import { assertProfileOwned } from "../services/profile";
import { refuseOverUserLimit } from "../services/redis";

export const lockedObjektsRouter = {
  list: pub
    .route({
      method: "GET",
      path: "/profiles/{address}/locked-objekts",
      tags: ["Profiles"],
      summary: "The objekts a profile has locked",
      spec: errorResponses(400),
    })
    .input(addressOrBareInputSchema)
    .output(documented(lockedObjektsOutputSchema))
    .handler(({ input }) => fetchLockedObjekts(input.address)),

  batchLock: authed
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds: asked }, context: { session } }) => {
      await refuseOverUserLimit("lock-write", session.user.id, 60, 60);
      await assertProfileOwned(address, session.user.id);

      // rows only for what the address holds, so they never outnumber its objekts
      const tokenIds = await ownedTokenIds(address, asked);
      if (tokenIds.length === 0) return;

      await db.transaction(async (tx) => {
        await chunk(tokenIds, TOKEN_CHUNK_SIZE, async (batch) => {
          await tx
            .delete(lockedObjekts)
            .where(and(inArray(lockedObjekts.tokenId, batch), eq(lockedObjekts.address, address)));

          await tx
            .insert(lockedObjekts)
            .values(
              batch.map((tokenId) => ({
                address,
                tokenId,
              })),
            )
            .onConflictDoNothing();
        });
      });
    }),

  batchUnlock: authed
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await assertProfileOwned(address, session.user.id);

      if (tokenIds.length === 0) return;

      await db
        .delete(lockedObjekts)
        .where(and(inArray(lockedObjekts.tokenId, tokenIds), eq(lockedObjekts.address, address)));
    }),
};
