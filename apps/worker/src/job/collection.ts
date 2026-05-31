import type { CosmoObjektMetadataV1, MetadataVersion } from "@repo/cosmo/types/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { chunk, slugifyObjekt } from "@repo/lib";
import { eq, inArray } from "drizzle-orm";

import { safeFetchMetadataV1, safeFetchMetadataV3 } from "@/lib/metadata-utils";

const BATCH_SIZE = 50;

export async function fixEmptyCollection({ version }: { version: MetadataVersion }) {
  const objektsResults = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(collections.slug, "empty-collection"));

  const totalBatches = Math.ceil(objektsResults.length / BATCH_SIZE);
  let batchNumber = 0;

  await chunk(objektsResults, BATCH_SIZE, async (batch) => {
    batchNumber++;
    await processMetadataBatch(batch, batchNumber, totalBatches, version);
  });
}

async function processMetadataBatch(
  batch: { id: string }[],
  batchNumber: number,
  totalBatches: number,
  version: MetadataVersion,
) {
  console.log(
    `[fix metadata] Processing batch ${batchNumber}/${totalBatches} (${batch.length} objekts)`,
  );

  const metadataResults = await Promise.all(
    batch.map(async (objekt) => ({
      objektId: objekt.id,
      metadata:
        version === 1 ? await safeFetchMetadataV1(objekt.id) : await safeFetchMetadataV3(objekt.id),
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

    if (!collectionMetadataUpdates.has(slug)) {
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

    const metadata = metadataResults.find((a) => a.objektId === objektId)?.metadata;
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
    // if (collectionMetadataUpdates.size > 0) {
    //   for (const [slug, metadata] of collectionMetadataUpdates.entries()) {
    //     await tx
    //       .update(collections)
    //       .set(
    //         enrichUpdateMetadata(metadata, {
    //           version,
    //         }),
    //       )
    //       .where(eq(collections.slug, slug));
    //   }
    // }

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

  console.log(
    `[fix metadata] Batch ${batchNumber}/${totalBatches}: Updated ${updates.length} objekts`,
  );
}
