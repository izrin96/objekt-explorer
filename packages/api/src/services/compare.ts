import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunkMap } from "@repo/lib";
import type { ListObjekt } from "@repo/lib/types/objekt";
import { and, eq, exists, inArray, sql } from "drizzle-orm";

import { TOKEN_CHUNK_SIZE } from "./utils";

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
export async function fetchListSlugs(slug: string): Promise<Set<string> | null> {
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

export function performComparison(
  sourceEntries: ListObjekt[],
  targetCollectionSlugs: ReadonlySet<string>,
  mode: "missing" | "matches",
): ListObjekt[] {
  return mode === "missing"
    ? sourceEntries.filter((e) => !targetCollectionSlugs.has(e.slug))
    : sourceEntries.filter((e) => targetCollectionSlugs.has(e.slug));
}
