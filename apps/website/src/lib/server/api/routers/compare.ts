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
        async function buildSourceEntries(): Promise<ValidObjekt[]> {
          const sourceList = await fetchListWithEntries(sourceId);

          if (!sourceList)
            throw new ORPCError("NOT_FOUND", {
              message: m.api_errors_compare_source_list_not_found(),
            });

          return buildListEntries(sourceList.entries, sourceList.isProfileBind, {
            artists,
            hideSerial: sourceList.hideSerial,
          });
        }

        async function buildTargetEntries(): Promise<ValidObjekt[]> {
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

            const isProfileHidden =
              targetProfile.privateProfile &&
              (!session?.user.id || session.user.id !== targetProfile.userId);

            if (isProfileHidden) return [];

            const ownedObjekts = await indexer
              .select({
                collection: getCollectionColumns(),
              })
              .from(objekts)
              .innerJoin(collections, eq(collections.id, objekts.collectionId))
              .where(eq(objekts.owner, targetProfile.address.toLowerCase()));

            return ownedObjekts.map((o) => o.collection);
          }

          if (targetType === "list" && targetListId) {
            const targetList = await fetchListWithEntries(targetListId);

            if (!targetList)
              throw new ORPCError("NOT_FOUND", {
                message: m.api_errors_compare_target_list_not_found(),
              });

            return buildListEntries(targetList.entries, targetList.isProfileBind, {
              artists,
              hideSerial: targetList.hideSerial,
            });
          }

          return [];
        }

        // allSettled so a target failure never preempts the source NOT_FOUND
        const [source, target] = await Promise.allSettled([
          buildSourceEntries(),
          buildTargetEntries(),
        ]);

        if (source.status === "rejected") throw source.reason;
        if (target.status === "rejected") throw target.reason;

        const result = performComparison(source.value, target.value, mode);

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
