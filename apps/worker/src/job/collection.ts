import { enrichUpdateMetadata, fetchMetadata } from "@repo/cosmo/server/metadata";
import type { CosmoObjektMetadataV1 } from "@repo/cosmo/types/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { chunk, slugifyObjekt } from "@repo/lib";
import { and, eq, gte, inArray } from "drizzle-orm";

const BATCH_SIZE = 50;

export async function fixEmptyCollection() {
  const objektsResults = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(collections.slug, "empty-collection"));

  const totalBatches = Math.ceil(objektsResults.length / BATCH_SIZE);
  let batchNumber = 0;

  await chunk(objektsResults, BATCH_SIZE, async (batch) => {
    batchNumber++;
    await processMetadataBatch(batch, batchNumber, totalBatches);
  });
}

export async function fixObjektSerialZero() {
  // cut-off date because older objekt have a real serial 0
  const objektsResults = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .where(and(eq(objekts.serial, 0), gte(objekts.mintedAt, "2026-03-23T01:00:00.000Z")));

  const totalBatches = Math.ceil(objektsResults.length / BATCH_SIZE);
  let batchNumber = 0;

  await chunk(objektsResults, BATCH_SIZE, async (batch) => {
    batchNumber++;
    await processMetadataBatch(batch, batchNumber, totalBatches);
  });
}

async function processMetadataBatch(
  batch: { id: string }[],
  batchNumber: number,
  totalBatches: number,
) {
  console.log(
    `[fix metadata] Processing batch ${batchNumber}/${totalBatches} (${batch.length} objekts)`,
  );

  const metadataResults = await Promise.all(
    batch.map(async (objekt) => ({
      objektId: objekt.id,
      metadata: await fetchMetadata(objekt.id),
    })),
  );

  const collectionSlugMap = new Map<string, string>();
  const updates: {
    objektId: string;
    collectionId: string;
    serial: number;
    transferable: boolean;
  }[] = [];
  const collectionMetadataUpdates: Map<string, CosmoObjektMetadataV1> = new Map();

  for (const result of metadataResults) {
    if (!result.metadata) {
      console.log(`[fix metadata] Failed to fetch metadata for token ID ${result.objektId}`);
      continue;
    }

    const slug = slugifyObjekt(result.metadata.objekt.collectionId);
    collectionSlugMap.set(result.objektId, slug);

    if (result.metadata.objekt.objektNo !== 0 && !collectionMetadataUpdates.has(slug)) {
      collectionMetadataUpdates.set(slug, result.metadata);
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

  for (const [objektId, slug] of collectionSlugMap) {
    const collectionId = slugToCollectionId.get(slug);
    if (!collectionId) {
      console.log(`[fix metadata] Collection not yet exist for token ID ${objektId}`);
      continue;
    }

    const metadata = metadataResults.find((r) => r.objektId === objektId)?.metadata;
    if (!metadata) continue;

    updates.push({
      objektId,
      collectionId,
      serial: metadata.objekt.objektNo,
      transferable: metadata.objekt.transferable,
    });
  }

  if (updates.length === 0 && collectionMetadataUpdates.size === 0) {
    console.log(`[fix metadata] Batch ${batchNumber}/${totalBatches}: No updates needed`);
    return;
  }

  await indexer.transaction(async (tx) => {
    if (collectionMetadataUpdates.size > 0) {
      await Promise.all(
        Array.from(collectionMetadataUpdates.entries()).map(([slug, metadata]) =>
          tx
            .update(collections)
            .set(enrichUpdateMetadata(metadata))
            .where(eq(collections.slug, slug)),
        ),
      );
    }

    if (updates.length > 0) {
      await Promise.all(
        updates.map((update) =>
          tx
            .update(objekts)
            .set({
              serial: update.serial,
              transferable: update.transferable,
              collectionId: update.collectionId,
            })
            .where(eq(objekts.id, update.objektId)),
        ),
      );

      await Promise.all(
        updates.map((update) =>
          tx
            .update(transfers)
            .set({
              collectionId: update.collectionId,
            })
            .where(eq(transfers.objektId, update.objektId)),
        ),
      );
    }
  });

  console.log(
    `[fix metadata] Batch ${batchNumber}/${totalBatches}: Updated ${updates.length} objekts`,
  );
}
