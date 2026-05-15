import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { gte, sql } from "drizzle-orm";

import { safeFetchMetadataV1 } from "@/lib/metadata-utils";

export async function refetchSerial() {
  const objektsResults = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .where(gte(objekts.mintedAt, "2026-03-23T01:00:00.000Z"));

  let batchNumber = 0;
  const totalBatches = Math.ceil(objektsResults.length / 50);

  await chunk(objektsResults, 50, async (batch) => {
    batchNumber++;
    await processBatch(batch, batchNumber, totalBatches);
  });
}

async function processBatch(batch: { id: string }[], batchNumber: number, totalBatches: number) {
  console.log(
    `[refetch serial] Processing batch ${batchNumber}/${totalBatches} (${batch.length} objekts)`,
  );

  // fetch metadata for all objekts in batch
  const metadataResults = await Promise.all(
    batch.map(async (objekt) => ({
      id: objekt.id,
      metadata: await safeFetchMetadataV1(objekt.id),
    })),
  );

  // filter out null metadata and create updates array (only for transferable: false)
  const updates = metadataResults
    .filter(
      (result): result is { id: string; metadata: NonNullable<typeof result.metadata> } =>
        result.metadata !== null,
    )
    .map((result) => ({
      id: result.id,
      metadata: result.metadata,
    }));

  if (updates.length === 0) {
    console.log(`[refetch serial] Batch ${batchNumber}/${totalBatches}: No updates needed`);
    return;
  }

  // batch update all objekts in a single query
  await indexer
    .update(objekts)
    .set({
      serial: sql`data.serial`,
      transferable: sql`data.transferable`,
    })
    .from(
      sql`(VALUES ${sql.join(
        updates.map(
          (u) =>
            sql`(${u.id}, ${u.metadata.objekt.objektNo}::integer, ${u.metadata.objekt.transferable}::boolean)`,
        ),
        sql`, `,
      )}) AS data(id, serial, transferable)`,
    )
    .where(sql`${objekts.id} = data.id`);

  console.log(
    `[refetch serial] Batch ${batchNumber}/${totalBatches}: Updated ${updates.length} objekts`,
  );
}
