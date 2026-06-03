import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";

import { findBoundaryTokenId } from "./populate-serial";

const extraCollectionSlugs = [
  "cream02-jiyeon-315z",
  "cream02-kotone-315z",
  "cream02-hayeon-315z",
  "cream02-jiwoo-315z",
  "cream02-xinyu-315z",
  "cream02-yeonji-315z",
];

/**
 * to count how many reserved token they assigned for offline objekts
 * probably not going to use as its not so accurate
 * especially on atom01 era
 */
export async function populateReservedCount() {
  const offlineCollections = await indexer
    .select({ id: collections.id, slug: collections.slug })
    .from(collections)
    .where(
      and(
        ne(collections.slug, "empty-collection"),
        isNull(collections.reservedTokenCount),
        or(eq(collections.onOffline, "offline"), inArray(collections.slug, extraCollectionSlugs)),
      ),
    )
    .orderBy(desc(collections.createdAt));

  if (offlineCollections.length === 0) {
    console.log("[populateReservedCount] No offline collections found");
    return;
  }

  console.log(
    `[populateReservedCount] Processing ${offlineCollections.length} offline collections`,
  );

  for (const { id, slug } of offlineCollections) {
    await processCollection(slug, id);
  }

  console.log("[populateReservedCount] Done");
}

async function processCollection(slug: string, collectionId: string) {
  const [collection] = await indexer
    .select({ collectionId: collections.collectionId })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);

  if (!collection) {
    console.log(`[populateReservedCount] ${slug}: Collection not found`);
    return;
  }

  const objektsInCollection = await indexer
    .select({ id: objekts.id })
    .from(objekts)
    .where(eq(objekts.collectionId, collectionId));

  if (objektsInCollection.length === 0) {
    console.log(`[populateReservedCount] ${slug}: No objekts found`);
    return;
  }

  const tokenIds = objektsInCollection.map((o) => parseInt(o.id));
  const minTokenId = Math.min(...tokenIds);
  const maxTokenId = Math.max(...tokenIds);

  // Find the first tokenId of this collection (scanning backwards)
  let baseTokenId: number | null;
  try {
    baseTokenId = await findBoundaryTokenId(collection.collectionId, minTokenId, -1);
  } catch {
    console.log(`[populateReservedCount] ${slug}: API error finding base token ID`);
    return;
  }

  if (baseTokenId === null) {
    console.log(`[populateReservedCount] ${slug}: Could not determine base token ID`);
    return;
  }

  // Find the last tokenId of this collection (scanning forwards)
  let endTokenId: number;
  try {
    endTokenId = await findBoundaryTokenId(collection.collectionId, maxTokenId, 1);
  } catch {
    console.log(`[populateReservedCount] ${slug}: API error finding end token ID`);
    return;
  }

  const reservedCount = endTokenId - baseTokenId + 1;

  console.log(
    `[populateReservedCount] ${slug}: base=${baseTokenId} end=${endTokenId} count=${reservedCount}`,
  );

  await indexer
    .update(collections)
    .set({ reservedTokenCount: reservedCount })
    .where(eq(collections.id, collectionId));

  console.log(`[populateReservedCount] ${slug}: Set reserved token count to ${reservedCount}`);
}
