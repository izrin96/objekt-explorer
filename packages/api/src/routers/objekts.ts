import { ORPCError } from "@orpc/server";

import { pub } from "../orpc";
import { documented, errorResponses } from "../schemas/common/documented";
import {
  heldByInputSchema,
  ownedByInputSchema,
  heldByOutputSchema,
  ownedByOutputSchema,
} from "../schemas/objekts";
import { fetchHeldObjekts, fetchOwnedObjekts, isCheckpointUnavailable } from "../services/owned";

export const objektsRouter = {
  ownedBy: pub
    .route({
      method: "GET",
      path: "/objekts/owned-by/{address}",
      tags: ["Objekts"],
      summary: "Objekts an address owns, newest received first",
      spec: errorResponses(400),
    })
    .input(ownedByInputSchema)
    .output(documented(ownedByOutputSchema))
    .handler(({ input: { address, ...query } }) => {
      if (isCheckpointUnavailable(address, query)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Checkpoint is unavailable for COSMO Spin",
        });
      }
      return fetchOwnedObjekts(address, query);
    }),

  heldBy: pub
    .route({
      method: "GET",
      path: "/objekts/held-by/{address}",
      tags: ["Objekts"],
      summary: "Copies an address holds, counted per collection",
      spec: errorResponses(400),
    })
    .input(heldByInputSchema)
    .output(documented(heldByOutputSchema))
    .handler(({ input: { address, artist } }) => fetchHeldObjekts(address, artist)),
};
