import { refuse } from "../lib/refuse";
import { authed, optionalAuthed } from "../orpc";
import { addressInputSchema } from "../schemas/common/address";
import { compareInputSchema } from "../schemas/compare";
import { compareLists, fetchHeldSlugs, findOwnProfileAddress } from "../services/compare";

export const compareRouter = {
  compare: optionalAuthed.input(compareInputSchema).handler(({ input }) => compareLists(input)),

  /** The market's compare: live rather than `heldBy`'s cached count, so a purchase shows at once. */
  heldSlugs: authed
    .input(addressInputSchema)
    .handler(async ({ context: { session }, input: { address } }) => {
      const profile = await findOwnProfileAddress(address, session.user.id);

      if (!profile)
        refuse("NOT_FOUND", "compare_target_profile_not_found", "Target profile not found");

      return { slugs: [...(await fetchHeldSlugs(profile.address))] };
    }),
};
