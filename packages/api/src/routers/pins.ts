import { authed, pub } from "../orpc";
import { addressOrBareInputSchema, addressTokenIdsInputSchema } from "../schemas/common/address";
import { documented, errorResponses } from "../schemas/common/documented";
import { pinsOutputSchema } from "../schemas/pins";
import { ownedTokenIds } from "../services/objekt/owned";
import { fetchPins, pinTokens, reorderPins, unpinTokens } from "../services/objekt/pins";
import { assertProfileOwned } from "../services/profile";
import { refuseOverUserLimit } from "../services/redis";

export const pinsRouter = {
  list: pub
    .route({
      method: "GET",
      path: "/profiles/{address}/pins",
      tags: ["Profiles"],
      summary: "A profile's pinned objekts, in display order",
      spec: errorResponses(400),
    })
    .input(addressOrBareInputSchema)
    .output(documented(pinsOutputSchema))
    .handler(({ input }) => fetchPins(input.address)),

  batchPin: authed
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds: asked }, context: { session } }) => {
      await refuseOverUserLimit("pin-write", session.user.id, 60, 60);
      await assertProfileOwned(address, session.user.id);

      // rows only for what the address holds, so they never outnumber its objekts
      const tokenIds = await ownedTokenIds(address, asked);
      if (tokenIds.length === 0) return;

      await pinTokens(address, tokenIds);
    }),

  batchUnpin: authed
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await assertProfileOwned(address, session.user.id);

      if (tokenIds.length === 0) return;

      await unpinTokens(address, tokenIds);
    }),

  reorderPins: authed
    .input(addressTokenIdsInputSchema)
    .handler(async ({ input: { address, tokenIds }, context: { session } }) => {
      await assertProfileOwned(address, session.user.id);

      await reorderPins(address, tokenIds);
    }),
};
