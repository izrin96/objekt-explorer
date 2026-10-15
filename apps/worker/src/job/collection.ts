import { enrichUpdateMetadata } from "@repo/cosmo/server/metadata";
import type { CosmoObjektMetadataV1, MetadataVersion } from "@repo/cosmo/types/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { addr, chunk, slugifyObjekt } from "@repo/lib";
import { eq, inArray, sql } from "drizzle-orm";

import { log } from "@/lib/log";
import { safeFetchMetadataV1, safeFetchMetadataV3 } from "@/lib/metadata-utils";

const BATCH_SIZE = 50;
const fixLog = log("fix-collection");

export async function fixEmptyCollection({ version }: { version: MetadataVersion }) {
  try {
    await fixStaleTransfers();
  } catch (error) {
    fixLog.error("Stale transfer fix failed:", error);
  }

  const objektsResults = await indexer
    .select({
      id: objekts.id,
      mintedAt: objekts.mintedAt,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(collections.slug, "empty-collection"));

  fixLog.debug(`${objektsResults.length} objekts to fix`);

  const totalBatches = Math.ceil(objektsResults.length / BATCH_SIZE);
  let batchNumber = 0;
  let updated = 0;
  let missing = 0;

  await chunk(objektsResults, BATCH_SIZE, async (batch) => {
    batchNumber++;
    try {
      const result = await processMetadataBatch(batch, batchNumber, totalBatches, version);
      updated += result.updated;
      missing += result.missing;
    } catch (error) {
      fixLog.error(`Batch ${batchNumber}/${totalBatches} failed:`, error);
    }
  });

  if (updated > 0)
    fixLog.info(`Moved ${updated} of ${objektsResults.length} objekts to their collection`);
  if (missing > 0)
    fixLog.warn(`Cosmo returned no metadata for ${missing} objekts; they retry next run`);
}

/**
 * Transfers left on empty-collection after their objekt moved back to its real
 * collection. The objekt is no longer empty, so the metadata pass never sees them.
 */
async function fixStaleTransfers() {
  const result = await indexer.execute(sql`
    update ${transfers} t
    set collection_id = o.collection_id
    from ${objekts} o, ${collections} tc, ${collections} oc
    where t.objekt_id = o.id
      and t.collection_id = tc.id
      and o.collection_id = oc.id
      and tc.slug = 'empty-collection'
      and oc.slug <> 'empty-collection'
  `);

  if (result.rowCount) fixLog.info(`Fixed ${result.rowCount} stale transfers`);
}

async function processMetadataBatch(
  batch: { id: string; mintedAt: string }[],
  batchNumber: number,
  totalBatches: number,
  version: MetadataVersion,
): Promise<{ updated: number; missing: number }> {
  fixLog.debug(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} objekts)`);

  const metadataResults = await Promise.all(
    batch.map(async (objekt) => ({
      objektId: objekt.id,
      mintedAt: objekt.mintedAt,
      metadata:
        version === 1 ? await safeFetchMetadataV1(objekt.id) : await safeFetchMetadataV3(objekt.id),
    })),
  );

  const collectionSlugMap = new Map<string, string>();
  const metadataMap = new Map<string, CosmoObjektMetadataV1>();
  const updates: {
    objektId: string;
    collectionId: string;
    serial: number;
    transferable: boolean;
  }[] = [];
  const collectionMetadataUpdates: Map<string, CosmoObjektMetadataV1> = new Map();
  const slugMintedAt = new Map<string, string>();

  let missing = 0;
  for (const result of metadataResults) {
    if (!result.metadata) {
      missing++;
      fixLog.debug(`No metadata for token ID ${result.objektId}`);
      continue;
    }

    metadataMap.set(result.objektId, result.metadata);

    const slug = slugifyObjekt(result.metadata.objekt.collectionId);
    collectionSlugMap.set(result.objektId, slug);

    if (!collectionMetadataUpdates.has(slug)) {
      collectionMetadataUpdates.set(slug, result.metadata);
    }

    const existingMintedAt = slugMintedAt.get(slug);
    if (!existingMintedAt || result.mintedAt < existingMintedAt) {
      slugMintedAt.set(slug, result.mintedAt);
    }
  }

  const uniqueSlugs = [...new Set(collectionSlugMap.values())];
  const collectionRecords = await indexer
    .select({
      id: collections.id,
      slug: collections.slug,
    })
    .from(collections)
    .where(inArray(collections.slug, uniqueSlugs));

  const slugToCollectionId = new Map(collectionRecords.map((c) => [c.slug, c.id]));

  const missingSlugs = uniqueSlugs.filter((s) => !slugToCollectionId.has(s));

  if (missingSlugs.length > 0) {
    const newCollections = missingSlugs.map((slug) => {
      const metadata = collectionMetadataUpdates.get(slug)!;
      const enriched = enrichUpdateMetadata(metadata, { version });
      return {
        id: Bun.randomUUIDv7(),
        contract: addr(metadata.objekt.tokenAddress),
        createdAt: slugMintedAt.get(slug)!,
        collectionId: metadata.objekt.collectionId,
        slug,
        ...enriched,
        backImage: enriched.backImage ?? metadata.objekt.backImage,
        textColor: enriched.textColor ?? metadata.objekt.textColor,
        accentColor: enriched.accentColor ?? metadata.objekt.accentColor,
      };
    });

    await indexer.insert(collections).values(newCollections).onConflictDoNothing({
      target: collections.slug,
    });
    fixLog.info(`Created ${newCollections.length} missing collections`);

    // re-select for canonical ids (conflict means indexer created it concurrently with a different id)
    const createdRecords = await indexer
      .select({ id: collections.id, slug: collections.slug })
      .from(collections)
      .where(inArray(collections.slug, missingSlugs));
    for (const record of createdRecords) {
      slugToCollectionId.set(record.slug, record.id);
    }
  }

  for (const [objektId, slug] of collectionSlugMap) {
    const collectionId = slugToCollectionId.get(slug);
    if (!collectionId) {
      fixLog.debug(`No collection yet for token ID ${objektId}`);
      continue;
    }

    const metadata = metadataMap.get(objektId);
    if (!metadata) continue;

    updates.push({
      objektId,
      collectionId,
      serial: metadata.objekt.objektNo,
      transferable: metadata.objekt.transferable,
    });
  }

  if (updates.length === 0) {
    fixLog.debug(`Batch ${batchNumber}/${totalBatches}: no updates needed`);
    return { updated: 0, missing };
  }

  await indexer.transaction(async (tx) => {
    if (updates.length > 0) {
      for (const update of updates) {
        // for objekts
        await tx
          .update(objekts)
          .set({
            collectionId: update.collectionId,
            // only for v1
            serial: version === 1 ? update.serial : undefined,
            transferable: version === 1 ? update.transferable : undefined,
          })
          .where(eq(objekts.id, update.objektId));
      }

      for (const update of updates) {
        // for transfers
        await tx
          .update(transfers)
          .set({
            collectionId: update.collectionId,
          })
          .where(eq(transfers.objektId, update.objektId));
      }
    }
  });

  fixLog.debug(`Batch ${batchNumber}/${totalBatches}: updated ${updates.length} objekts`);
  return { updated: updates.length, missing };
}
