import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { isAddress } from "@repo/lib";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { eq } from "drizzle-orm";
import { useIntlayer } from "react-intlayer/server";

import { compareInputSchema } from "../../../compare/schemas";
import { parseSelectedArtists } from "../../cookie.server";
import { buildListEntries, fetchListWithEntries } from "../../list.server";
import { getUserLocale } from "../../locale.server";
import { getCollectionColumns } from "../../objekt.server";
import { pub } from "../orpc";

export const compareRouter = {
  compare: pub
    .input(compareInputSchema)
    .handler(
      async ({
        input: { sourceId, targetType, mode, targetProfile: targetProfileId, targetListId },
      }) => {
        const artists = await parseSelectedArtists();
        const locale = await getUserLocale();
        const content = useIntlayer("api_errors", locale);

        const sourceList = await fetchListWithEntries(sourceId);

        if (!sourceList)
          throw new ORPCError("NOT_FOUND", {
            message: content.compare.source_list_not_found.value,
          });

        const sourceComparisonEntries = await buildListEntries(
          sourceList.entries,
          sourceList.listType,
          { artists },
        );

        let targetComparisonEntries: ValidObjekt[] = [];

        if (targetType === "profile" && targetProfileId) {
          const targetIsAddress = isAddress(targetProfileId);
          const targetProfile = await db.query.userAddress.findFirst({
            columns: {
              address: true,
              nickname: true,
            },
            where: {
              [targetIsAddress ? "address" : "nickname"]: targetProfileId,
            },
          });

          if (!targetProfile)
            throw new ORPCError("NOT_FOUND", {
              message: content.compare.target_profile_not_found.value,
            });

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
              message: content.compare.target_list_not_found.value,
            });

          targetComparisonEntries = await buildListEntries(
            targetList.entries,
            targetList.listType,
            { artists },
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
