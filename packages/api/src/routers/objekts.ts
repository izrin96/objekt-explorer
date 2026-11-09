import { refuse } from "../lib/refuse";
import { pub } from "../orpc";
import { documented, errorResponses } from "../schemas/common/documented";
import {
  heldByInputSchema,
  ownedByInputSchema,
  heldByOutputSchema,
  ownedByOutputSchema,
  ownedCopiesOutputSchema,
} from "../schemas/objekts";
import {
  fetchHeldObjekts,
  fetchOwnedCopies,
  fetchOwnedObjekts,
  isCheckpointUnavailable,
} from "../services/objekt/owned";

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
        refuse(
          "BAD_REQUEST",
          "objekt_checkpoint_unavailable",
          "Checkpoint is unavailable for COSMO Spin",
        );
      }
      return fetchOwnedObjekts(address, query);
    }),

  ownedCopies: pub
    .route({
      method: "GET",
      path: "/objekts/owned-copies/{address}",
      tags: ["Objekts"],
      summary: "An address's copies without their collection fields, newest received first",
      description:
        "The pages of owned-by with each copy's own fields only; join them to /collections by slug.",
      spec: errorResponses(400),
    })
    .input(ownedByInputSchema)
    .output(documented(ownedCopiesOutputSchema))
    .handler(({ input: { address, ...query } }) => {
      if (isCheckpointUnavailable(address, query)) {
        refuse(
          "BAD_REQUEST",
          "objekt_checkpoint_unavailable",
          "Checkpoint is unavailable for COSMO Spin",
        );
      }
      return fetchOwnedCopies(address, query);
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
