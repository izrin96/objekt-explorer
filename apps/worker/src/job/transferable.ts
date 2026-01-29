import { fetchMetadataV1 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { and, eq, inArray } from "drizzle-orm";

export async function fixTransferable() {
  // get all basic and first class objekt
  const objektsResults = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(and(inArray(collections.class, ["Basic", "First"]), eq(objekts.transferable, true)));

  let batchNumber = 0;
  const totalBatches = Math.ceil(objektsResults.length / 50);

  await chunk(objektsResults, 50, async (batch) => {
    batchNumber++;
    await processBatch(batch, batchNumber, totalBatches);
  });
}

async function fetchMetadata(tokenId: string) {
  const response = await fetchMetadataV1(tokenId);

  if (response.ok && response._data) {
    return response._data;
  }

  return null;
}

async function processBatch(batch: { id: string }[], batchNumber: number, totalBatches: number) {
  console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} objekts)`);

  // fetch metadata for all objekts in batch
  const metadataResults = await Promise.all(
    batch.map(async (objekt) => ({
      id: objekt.id,
      metadata: await fetchMetadata(objekt.id),
    })),
  );

  // filter out null metadata and create updates array (only for transferable: false)
  const updates = metadataResults
    .filter(
      (result): result is { id: string; metadata: NonNullable<typeof result.metadata> } =>
        result.metadata !== null && !result.metadata.objekt.transferable,
    )
    .map((result) => ({
      id: result.id,
      transferable: result.metadata.objekt.transferable,
    }));

  if (updates.length === 0) {
    console.log(`Batch ${batchNumber}/${totalBatches}: No updates needed`);
    return;
  }

  // batch update all objekts in a transaction
  await indexer.transaction(async (tx) => {
    await Promise.all(
      updates.map((update) =>
        tx
          .update(objekts)
          .set({
            transferable: update.transferable,
          })
          .where(eq(objekts.id, update.id)),
      ),
    );
  });

  console.log(`Batch ${batchNumber}/${totalBatches}: Updated ${updates.length} objekts`);
}
