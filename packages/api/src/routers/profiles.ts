import { optionalAuthed, pub } from "../orpc";
import { addressInputSchema } from "../schemas/common/address";
import { documented } from "../schemas/common/documented";
import { lockedObjektsOutputSchema } from "../schemas/locked-objekts";
import { pinsOutputSchema } from "../schemas/pins";
import { profilePreviewOutputSchema } from "../schemas/profile";
import { fetchLockedObjekts } from "../services/locked-objekts";
import { fetchPins } from "../services/pins";
import { fetchProfilePreview } from "../services/profile";

/**
 * `/api/v1` only. The `/rpc` procedures behind these take a bare address, and keep it so a tab
 * opened before a deploy still works; a path parameter has to be an object field.
 */
export const profilesRouter = {
  preview: optionalAuthed
    .route({
      method: "GET",
      path: "/profiles/{address}",
      tags: ["Profiles"],
      summary: "A profile's hover card: nickname, banner and counts",
    })
    .input(addressInputSchema)
    .output(documented(profilePreviewOutputSchema))
    .handler(({ input, context: { session } }) =>
      fetchProfilePreview(input.address, session?.user),
    ),

  pins: pub
    .route({
      method: "GET",
      path: "/profiles/{address}/pins",
      tags: ["Profiles"],
      summary: "A profile's pinned objekts, in display order",
    })
    .input(addressInputSchema)
    .output(documented(pinsOutputSchema))
    .handler(({ input }) => fetchPins(input.address)),

  lockedObjekts: pub
    .route({
      method: "GET",
      path: "/profiles/{address}/locked-objekts",
      tags: ["Profiles"],
      summary: "The objekts a profile has locked",
    })
    .input(addressInputSchema)
    .output(documented(lockedObjektsOutputSchema))
    .handler(({ input }) => fetchLockedObjekts(input.address)),
};
