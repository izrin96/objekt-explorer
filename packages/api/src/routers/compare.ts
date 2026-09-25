import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { isAddress } from "@repo/lib";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, exists, sql } from "drizzle-orm";

import { optionalAuthed, selectedArtistsMiddleware } from "../orpc";
import { compareInputSchema } from "../schemas/compare";
import { buildListEntries, fetchListWithEntries } from "../services/list";

export const compareRouter = {
  compare: optionalAuthed
    .use(selectedArtistsMiddleware)
    .input(compareInputSchema)
    .handler(
      async ({
        context: { artists, messages, session },
        input: { sourceId, targetType, mode, targetProfile: targetProfileId, targetListId },
      }) => {
        async function buildSourceEntries(): Promise<ValidObjekt[]> {
          const sourceList = await fetchListWithEntries(sourceId);

          if (!sourceList)
            throw new ORPCError("NOT_FOUND", {
              message: messages.compare_source_list_not_found(),
            });

          return buildListEntries(sourceList.entries, sourceList.isProfileBind, {
            artists,
            hideSerial: sourceList.hideSerial,
          });
        }

        /** the collection slugs the target holds; the comparison needs nothing else */
        async function buildTargetSlugs(): Promise<Set<string>> {
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
                message: messages.compare_target_profile_not_found(),
              });

            const isProfileHidden =
              targetProfile.privateProfile &&
              (!session?.user.id || session.user.id !== targetProfile.userId);

            if (isProfileHidden) return new Set();

            // one index probe per collection: a large owner such as Spin holds
            // millions of copies, which listing them would pull into memory
            const owner = targetProfile.address.toLowerCase();
            const held = await indexer
              .select({ slug: collections.slug })
              .from(collections)
              .where(
                exists(
                  indexer
                    .select({ one: sql`1` })
                    .from(objekts)
                    .where(and(eq(objekts.collectionId, collections.id), eq(objekts.owner, owner))),
                ),
              );

            return new Set(held.map((row) => row.slug));
          }

          if (targetType === "list" && targetListId) {
            const targetList = await fetchListWithEntries(targetListId);

            if (!targetList)
              throw new ORPCError("NOT_FOUND", {
                message: messages.compare_target_list_not_found(),
              });

            const entries = await buildListEntries(targetList.entries, targetList.isProfileBind, {
              artists,
              hideSerial: targetList.hideSerial,
            });
            return new Set(entries.map((entry) => entry.slug));
          }

          return new Set();
        }

        // allSettled so a target failure never preempts the source NOT_FOUND
        const [source, target] = await Promise.allSettled([
          buildSourceEntries(),
          buildTargetSlugs(),
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
  targetCollectionSlugs: ReadonlySet<string>,
  mode: "missing" | "matches",
): ValidObjekt[] {
  const filteredEntries =
    mode === "missing"
      ? sourceEntries.filter((e) => !targetCollectionSlugs.has(e.slug))
      : sourceEntries.filter((e) => targetCollectionSlugs.has(e.slug));

  return filteredEntries.map((entry) => entry);
}
