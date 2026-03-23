import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, eq, gte, asc, max } from "drizzle-orm";

export async function populateSerial() {
  const collectionDiscover = await indexer
    .selectDistinctOn([collections.id], { id: collections.id })
    .from(collections)
    .leftJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.serial, 0),
        eq(collections.onOffline, "online"),
        gte(collections.createdAt, "2026-03-23T01:00:00.000Z"),
      ),
    );

  if (collectionDiscover.length === 0) {
    console.log("[populateSerial] No collections with zero serials found");
    return;
  }

  console.log(`[populateSerial] Found ${collectionDiscover.length} collections with zero serials`);

  for (const { id: collectionId } of collectionDiscover) {
    await processCollection(collectionId);
  }

  console.log("[populateSerial] Done");
}

async function processCollection(collectionId: string) {
  await indexer.transaction(async (tx) => {
    const maxSerialResult = await tx
      .select({ maxSerial: max(objekts.serial) })
      .from(objekts)
      .where(eq(objekts.collectionId, collectionId));

    const nextSerial = (maxSerialResult[0]?.maxSerial ?? 0) + 1;

    const zeroSerialObjekts = await tx
      .select({ id: objekts.id })
      .from(objekts)
      .where(and(eq(objekts.collectionId, collectionId), eq(objekts.serial, 0)))
      .orderBy(asc(objekts.mintedAt), asc(objekts.id));

    if (zeroSerialObjekts.length === 0) {
      return;
    }

    console.log(
      `[populateSerial] Collection ${collectionId}: Assigning ${zeroSerialObjekts.length} serials starting from ${nextSerial}`,
    );

    const batchSize = 100;
    for (let i = 0; i < zeroSerialObjekts.length; i += batchSize) {
      const batch = zeroSerialObjekts.slice(i, i + batchSize);

      await Promise.all(
        batch.map((obj, idx) =>
          tx
            .update(objekts)
            .set({ serial: nextSerial + i + idx })
            .where(eq(objekts.id, obj.id)),
        ),
      );
    }

    console.log(
      `[populateSerial] Collection ${collectionId}: Updated ${zeroSerialObjekts.length} objekts`,
    );
  });
}
