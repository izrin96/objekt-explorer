import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunkMap, isAddress } from "@repo/lib";
import type { ListObjekt } from "@repo/lib/types/objekt";
import { and, eq, exists, inArray, sql } from "drizzle-orm";

import { TOKEN_CHUNK_SIZE } from "../constants";
import { refuse } from "../lib/refuse";
import type { CompareInput } from "../schemas/compare";
import { buildListEntries } from "./list/entry-view";
import { fetchListWithEntries } from "./list/read";

/**
 * One index probe per collection: a large owner such as Spin holds millions
 * of copies, which listing them would pull into memory.
 */
export async function fetchHeldSlugs(address: string): Promise<Set<string>> {
  const owner = address.toLowerCase();
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

/**
 * The collection slugs a list holds, or `null` when there is no such list. A
 * list shows only the column its binding uses, so only that column counts.
 */
async function fetchListSlugs(slug: string): Promise<Set<string> | null> {
  const list = await db.query.lists.findFirst({
    columns: { isProfileBind: true },
    with: { entries: { columns: { collectionSlug: true, objektId: true } } },
    where: { slug },
  });

  if (!list) return null;

  if (!list.isProfileBind) {
    return new Set(list.entries.flatMap((entry) => entry.collectionSlug ?? []));
  }

  const objektIds = list.entries.flatMap((entry) => entry.objektId ?? []);
  const rows = await chunkMap(objektIds, TOKEN_CHUNK_SIZE, (batch) =>
    indexer
      .select({ slug: collections.slug })
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(inArray(objekts.id, batch)),
  );

  return new Set(rows.map((row) => row.slug));
}

function performComparison(
  sourceEntries: ListObjekt[],
  targetCollectionSlugs: ReadonlySet<string>,
  mode: "missing" | "matches",
): ListObjekt[] {
  return mode === "missing"
    ? sourceEntries.filter((e) => !targetCollectionSlugs.has(e.slug))
    : sourceEntries.filter((e) => targetCollectionSlugs.has(e.slug));
}

/** A profile by nickname or address. */
function findProfileAddress(identifier: string) {
  return db.query.userAddress.findFirst({
    columns: { address: true },
    where: {
      [isAddress(identifier) ? "address" : "nickname"]: identifier,
    },
  });
}

/** One of the caller's own profiles. */
export function findOwnProfileAddress(address: string, userId: string) {
  return db.query.userAddress.findFirst({
    columns: { address: true },
    where: { address, userId },
  });
}

/** The source list's objekts compared against a target list or profile, by `input.mode`. */
export async function compareLists(input: CompareInput) {
  async function buildSourceEntries(): Promise<ListObjekt[]> {
    const sourceList = await fetchListWithEntries(input.sourceId);

    if (!sourceList) refuse("NOT_FOUND", "compare_source_list_not_found", "Source list not found");

    return buildListEntries(sourceList.entries, sourceList.isProfileBind, {
      artists: input.artist,
      hideSerial: sourceList.hideSerial,
    });
  }

  /** the collection slugs the target holds; the comparison needs nothing else */
  async function buildTargetSlugs(): Promise<Set<string>> {
    if (input.targetType === "profile") {
      const targetProfile = await findProfileAddress(input.targetProfile);

      if (!targetProfile)
        refuse("NOT_FOUND", "compare_target_profile_not_found", "Target profile not found");

      return fetchHeldSlugs(targetProfile.address);
    }

    const targetSlugs = await fetchListSlugs(input.targetListId);

    if (!targetSlugs) refuse("NOT_FOUND", "compare_target_list_not_found", "Target list not found");

    return targetSlugs;
  }

  // allSettled so a target failure never preempts the source NOT_FOUND
  const [source, target] = await Promise.allSettled([buildSourceEntries(), buildTargetSlugs()]);

  if (source.status === "rejected") throw source.reason;
  if (target.status === "rejected") throw target.reason;

  return {
    objekts: performComparison(source.value, target.value, input.mode),
  };
}
