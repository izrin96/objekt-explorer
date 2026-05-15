import { enrichUpdateMetadata } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { eq, gte } from "drizzle-orm";

import { safeFetchMetadataV1 } from "@/lib/metadata-utils";

export async function refetchCollection() {
  const distinctCollections = await indexer
    .select({ collectionId: objekts.collectionId })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(gte(collections.createdAt, "2026-05-11T06:00:00.000Z"))
    .groupBy(objekts.collectionId);

  const validCollections = distinctCollections
    .map((c) => c.collectionId)
    .filter((id): id is string => id !== null);

  console.log(`[refetch collection] Found ${validCollections.length} unique collections`);

  let batchNumber = 0;
  const totalBatches = Math.ceil(validCollections.length / 50);

  await chunk(validCollections, 50, async (batch) => {
    batchNumber++;
    await processBatch(batch, batchNumber, totalBatches);
  });
}

async function processBatch(collectionIds: string[], batchNumber: number, totalBatches: number) {
  console.log(
    `[refetch collection] Processing batch ${batchNumber}/${totalBatches} (${collectionIds.length} collections)`,
  );

  const sampleObjekts = await Promise.all(
    collectionIds.map((collectionId) =>
      indexer
        .select({ id: objekts.id, collectionId: objekts.collectionId })
        .from(objekts)
        .where(eq(objekts.collectionId, collectionId))
        .limit(1)
        .then((rows) => rows[0]),
    ),
  );

  const validSamples = sampleObjekts.filter(
    (s): s is { id: string; collectionId: string } => s !== undefined,
  );

  const metadataResults = await Promise.all(
    validSamples.map(async (sample) => ({
      collectionId: sample.collectionId,
      metadata: await safeFetchMetadataV1(sample.id),
    })),
  );

  const validMetadata = metadataResults.filter(
    (r): r is { collectionId: string; metadata: NonNullable<typeof r.metadata> } =>
      r.metadata !== null,
  );

  if (validMetadata.length === 0) {
    console.log(`[refetch collection] Batch ${batchNumber}/${totalBatches}: No metadata fetched`);
    return;
  }

  await indexer.transaction(async (tx) => {
    for (const { collectionId, metadata } of validMetadata) {
      await tx
        .update(collections)
        .set(enrichUpdateMetadata(metadata))
        .where(eq(collections.id, collectionId));
    }
  });

  console.log(
    `[refetch collection] Batch ${batchNumber}/${totalBatches}: Updated ${validMetadata.length} collections`,
  );
}
