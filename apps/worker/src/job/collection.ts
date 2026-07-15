import { enrichUpdateMetadata } from "@repo/cosmo/server/metadata";
import type { CosmoObjektMetadataV1, MetadataVersion } from "@repo/cosmo/types/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { addr, chunk, slugifyObjekt } from "@repo/lib";
import { eq, inArray } from "drizzle-orm";

import { safeFetchMetadataV1, safeFetchMetadataV3 } from "@/lib/metadata-utils";

const BATCH_SIZE = 50;

export async function fixEmptyCollection({ version }: { version: MetadataVersion }) {
  const objektsResults = await indexer
    .select({
      id: objekts.id,
      mintedAt: objekts.mintedAt,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(collections.slug, "empty-collection"));

  console.log(`[fix empty collection] Found ${objektsResults.length} objekts to fix`);

  const totalBatches = Math.ceil(objektsResults.length / BATCH_SIZE);
  let batchNumber = 0;

  await chunk(objektsResults, BATCH_SIZE, async (batch) => {
    batchNumber++;
    try {
      await processMetadataBatch(batch, batchNumber, totalBatches, version);
    } catch (error) {
      console.error(`[fix empty collection] Batch ${batchNumber}/${totalBatches} failed:`, error);
    }
  });
}

async function processMetadataBatch(
  batch: { id: string; mintedAt: string }[],
  batchNumber: number,
  totalBatches: number,
  version: MetadataVersion,
) {
  console.log(
    `[fix empty collection] Processing batch ${batchNumber}/${totalBatches} (${batch.length} objekts)`,
  );

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

  for (const result of metadataResults) {
    if (!result.metadata) {
      console.log(
        `[fix empty collection] Failed to fetch metadata for token ID ${result.objektId}`,
      );
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
    console.log(`[fix empty collection] Created ${newCollections.length} missing collections`);

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
      console.log(`[fix empty collection] Collection not yet exist for token ID ${objektId}`);
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
    console.log(`[fix empty collection] Batch ${batchNumber}/${totalBatches}: No updates needed`);
    return;
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

  console.log(
    `[fix empty collection] Batch ${batchNumber}/${totalBatches}: Updated ${updates.length} objekts`,
  );
}
