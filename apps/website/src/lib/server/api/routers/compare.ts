import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { isAddress } from "@repo/lib";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { eq } from "drizzle-orm";

import { compareInputSchema } from "@/lib/universal/compare";
import { m } from "@/paraglide/messages";

import { buildListEntries, fetchListWithEntries } from "../../list.server";
import { getCollectionColumns } from "../../objekt.server";
import { optionalAuthed, selectedArtistsMiddleware } from "../orpc";

export const compareRouter = {
  compare: optionalAuthed
    .use(selectedArtistsMiddleware)
    .input(compareInputSchema)
    .handler(
      async ({
        context: { artists, session },
        input: { sourceId, targetType, mode, targetProfile: targetProfileId, targetListId },
      }) => {
        const sourceList = await fetchListWithEntries(sourceId);

        if (!sourceList)
          throw new ORPCError("NOT_FOUND", {
            message: m.api_errors_compare_source_list_not_found(),
          });

        const sourceComparisonEntries = await buildListEntries(
          sourceList.entries,
          sourceList.isProfileBind,
          { artists, hideSerial: sourceList.hideSerial },
        );

        let targetComparisonEntries: ValidObjekt[] = [];

        if (targetType === "profile" && targetProfileId) {
          const targetIsAddress = isAddress(targetProfileId);
          const targetProfile = await db.query.userAddress.findFirst({
            columns: {
              address: true,
              nickname: true,
              privateProfile: true,
              userId: true,
            },
            where: {
              [targetIsAddress ? "address" : "nickname"]: targetProfileId,
            },
          });

          if (!targetProfile)
            throw new ORPCError("NOT_FOUND", {
              message: m.api_errors_compare_target_profile_not_found(),
            });

          if (
            targetProfile.privateProfile &&
            (!session?.user.id || session.user.id !== targetProfile.userId)
          ) {
            throw new ORPCError("FORBIDDEN", {
              message: m.api_errors_compare_target_profile_private(),
            });
          }

          const ownedObjekts = await indexer
            .select({
              collection: getCollectionColumns(),
            })
            .from(objekts)
            .innerJoin(collections, eq(collections.id, objekts.collectionId))
            .where(eq(objekts.owner, targetProfile.address.toLowerCase()));

          targetComparisonEntries = ownedObjekts.map((o) => o.collection);
        } else if (targetType === "list" && targetListId) {
          const targetList = await fetchListWithEntries(targetListId);

          if (!targetList)
            throw new ORPCError("NOT_FOUND", {
              message: m.api_errors_compare_target_list_not_found(),
            });

          targetComparisonEntries = await buildListEntries(
            targetList.entries,
            targetList.isProfileBind,
            { artists, hideSerial: targetList.hideSerial },
          );
        }

        const result = performComparison(sourceComparisonEntries, targetComparisonEntries, mode);

        return {
          objekts: result,
        };
      },
    ),
};

function performComparison(
  sourceEntries: ValidObjekt[],
  targetEntries: ValidObjekt[],
  mode: "missing" | "matches",
): ValidObjekt[] {
  const targetCollectionSlugs = new Set(targetEntries.map((e) => e.slug));

  const filteredEntries =
    mode === "missing"
      ? sourceEntries.filter((e) => !targetCollectionSlugs.has(e.slug))
      : sourceEntries.filter((e) => targetCollectionSlugs.has(e.slug));

  return filteredEntries.map((entry) => entry);
}
