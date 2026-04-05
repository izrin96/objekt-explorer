import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import type { ListEntry } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { mapOwnedObjekt } from "@repo/lib/server/objekt";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { eq, inArray } from "drizzle-orm";
import { useIntlayer } from "next-intlayer/server";

import { compareInputSchema } from "../../../compare/schemas";
import { getUserLocale } from "../../locale";
import { getCollectionColumns } from "../../objekt";
import { pub } from "../orpc";

export const compareRouter = {
  compare: pub
    .input(compareInputSchema)
    .handler(
      async ({
        input: { sourceId, targetType, mode, targetProfile: targetProfileId, targetListId },
      }) => {
        const locale = await getUserLocale();
        const content = useIntlayer("api_errors", locale);

        // Fetch source list
        const sourceList = await db.query.lists.findFirst({
          columns: {
            listType: true,
          },
          with: {
            entries: {
              orderBy: {
                id: "asc",
              },
              columns: {
                id: true,
                collectionSlug: true,
                objektId: true,
                price: true,
                isQyop: true,
                note: true,
              },
            },
          },
          where: { slug: sourceId },
        });

        if (!sourceList)
          throw new ORPCError("NOT_FOUND", {
            message: content.compare.source_list_not_found.value,
          });

        // Build source comparison entries
        const sourceComparisonEntries = await buildComparisonEntries(
          sourceList.entries,
          sourceList.listType,
        );

        // Fetch target comparison entries based on targetType
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

          // Query owned objekts from indexer
          const ownedObjekts = await indexer
            .select({
              collection: getCollectionColumns(),
            })
            .from(objekts)
            .innerJoin(collections, eq(collections.id, objekts.collectionId))
            .where(eq(objekts.owner, targetProfile.address.toLowerCase()));

          targetComparisonEntries = ownedObjekts.map((o) => o.collection);
        } else if (targetType === "list" && targetListId) {
          const targetList = await db.query.lists.findFirst({
            columns: {
              listType: true,
            },
            with: {
              entries: {
                orderBy: {
                  id: "asc",
                },
                columns: {
                  id: true,
                  collectionSlug: true,
                  objektId: true,
                  price: true,
                  isQyop: true,
                  note: true,
                },
              },
            },
            where: { slug: targetListId },
          });

          if (!targetList)
            throw new ORPCError("NOT_FOUND", {
              message: content.compare.target_list_not_found.value,
            });

          targetComparisonEntries = await buildComparisonEntries(
            targetList.entries,
            targetList.listType,
          );
        }

        const result = performComparison(sourceComparisonEntries, targetComparisonEntries, mode);

        // Perform comparison
        return {
          objekts: result,
        };
      },
    ),
};

async function buildComparisonEntries(
  entries: Pick<ListEntry, "collectionSlug" | "objektId" | "id" | "price" | "isQyop" | "note">[],
  listType: "normal" | "profile",
): Promise<ValidObjekt[]> {
  if (listType === "profile") {
    // Profile lists use objektId
    const objektIds = entries.map((e) => e.objektId).filter((a) => a !== null);
    if (objektIds.length === 0) return [];

    const objektsData = await indexer
      .select({
        objekt: objekts,
        collection: getCollectionColumns(),
      })
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(inArray(objekts.id, objektIds));

    const objektMap = new Map(objektsData.map((o) => [o.objekt.id, o]));

    return entries
      .filter((e) => e.objektId !== null)
      .map((entry) => {
        const data = objektMap.get(entry.objektId!);
        if (!data || !data.collection) return null;
        const ownedObjekt = mapOwnedObjekt(data.objekt, data.collection);
        return Object.assign({}, ownedObjekt, {
          id: entry.id.toString(),
          order: entry.id,
          listPrice: entry.price ?? undefined,
          isQyop: entry.isQyop ?? undefined,
          note: entry.note ?? undefined,
        });
      })
      .filter((a) => a !== null);
  } else {
    // Normal lists use collectionSlug
    const slugs = entries.map((e) => e.collectionSlug).filter((a) => a !== null);
    if (slugs.length === 0) return [];

    const collectionsData = await indexer
      .select(getCollectionColumns())
      .from(collections)
      .where(inArray(collections.slug, slugs));

    const collectionMap = new Map(collectionsData.map((c) => [c.slug, c]));

    return entries
      .filter((e) => e.collectionSlug !== null)
      .map((entry) => {
        const collection = collectionMap.get(entry.collectionSlug!);
        if (!collection) return null;
        return Object.assign({}, collection, {
          id: entry.id.toString(),
          order: entry.id,
          listPrice: entry.price ?? undefined,
          isQyop: entry.isQyop ?? undefined,
          note: entry.note ?? undefined,
        });
      })
      .filter((a) => a !== null);
  }
}

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
