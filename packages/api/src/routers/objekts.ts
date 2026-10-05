import { ORPCError } from "@orpc/server";
import * as z from "zod";

import { pub } from "../orpc";
import { ownedBySchema } from "../schemas/owned-by";
import { fetchHeldObjekts, fetchOwnedObjekts, isCheckpointUnavailable } from "../services/owned";

export const objektsRouter = {
  ownedBy: pub
    .route({
      method: "GET",
      path: "/objekts/owned-by/{address}",
      tags: ["Objekts"],
      summary: "Objekts an address owns, newest received first",
    })
    .input(ownedBySchema.extend({ address: z.string() }))
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
    })
    .input(ownedBySchema.pick({ artist: true }).extend({ address: z.string() }))
    .handler(({ input: { address, artist } }) => fetchHeldObjekts(address, artist)),
};
