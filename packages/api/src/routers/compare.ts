import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { isAddress } from "@repo/lib";
import type { ListObjekt } from "@repo/lib/types/objekt";

import { authed, optionalAuthed } from "../orpc";
import { addressInputSchema } from "../schemas/common/address";
import { compareInputSchema } from "../schemas/compare";
import { fetchHeldSlugs, fetchListSlugs, performComparison } from "../services/compare";
import { buildListEntries, fetchListWithEntries } from "../services/list";
import { isProfileHidden } from "../services/privacy";

export const compareRouter = {
  compare: optionalAuthed
    .input(compareInputSchema)
    .handler(async ({ context: { messages, session }, input }) => {
      async function buildSourceEntries(): Promise<ListObjekt[]> {
        const sourceList = await fetchListWithEntries(input.sourceId);

        if (!sourceList)
          throw new ORPCError("NOT_FOUND", {
            message: messages.compare_source_list_not_found(),
          });

        return buildListEntries(sourceList.entries, sourceList.isProfileBind, {
          artists: input.artist,
          hideSerial: sourceList.hideSerial,
        });
      }

      /** the collection slugs the target holds; the comparison needs nothing else */
      async function buildTargetSlugs(): Promise<Set<string>> {
        if (input.targetType === "profile") {
          const targetProfile = await db.query.userAddress.findFirst({
            columns: {
              address: true,
              privateProfile: true,
              userId: true,
            },
            where: {
              [isAddress(input.targetProfile) ? "address" : "nickname"]: input.targetProfile,
            },
          });

          // a hidden profile reads as a missing one: an empty set would pass
          // for a real result, and a distinct error would confirm it exists
          if (!targetProfile || isProfileHidden(targetProfile, session?.user.id))
            throw new ORPCError("NOT_FOUND", {
              message: messages.compare_target_profile_not_found(),
            });

          return fetchHeldSlugs(targetProfile.address);
        }

        const targetSlugs = await fetchListSlugs(input.targetListId);

        if (!targetSlugs)
          throw new ORPCError("NOT_FOUND", {
            message: messages.compare_target_list_not_found(),
          });

        return targetSlugs;
      }

      // allSettled so a target failure never preempts the source NOT_FOUND
      const [source, target] = await Promise.allSettled([buildSourceEntries(), buildTargetSlugs()]);

      if (source.status === "rejected") throw source.reason;
      if (target.status === "rejected") throw target.reason;

      return {
        objekts: performComparison(source.value, target.value, input.mode),
      };
    }),

  /** The market's compare: live rather than `heldBy`'s cached count, so a purchase shows at once. */
  heldSlugs: authed
    .input(addressInputSchema)
    .handler(async ({ context: { messages, session }, input: { address } }) => {
      const profile = await db.query.userAddress.findFirst({
        columns: { address: true },
        where: { address, userId: session.user.id },
      });

      if (!profile)
        throw new ORPCError("NOT_FOUND", {
          message: messages.compare_target_profile_not_found(),
        });

      return { slugs: [...(await fetchHeldSlugs(profile.address))] };
    }),
};
