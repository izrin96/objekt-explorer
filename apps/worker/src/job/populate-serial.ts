import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, eq, asc, gt } from "drizzle-orm";

export async function populateSerial() {
  const collectionDiscover = await indexer
    .selectDistinctOn([collections.id], { id: collections.id })
    .from(collections)
    .innerJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(and(eq(objekts.serial, 0), eq(collections.onOffline, "online")));

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
    const allObjekts = await tx
      .select({ id: objekts.id, serial: objekts.serial })
      .from(objekts)
      .where(eq(objekts.collectionId, collectionId))
      .orderBy(asc(objekts.id));

    if (allObjekts.length === 0) {
      return;
    }

    const sortedAllObjekts = allObjekts.toSorted((a, b) => parseInt(a.id) - parseInt(b.id));

    const updates: { id: string; newSerial: number }[] = [];

    const isNew = sortedAllObjekts.every((a) => a.serial === 0);
    const maxSerial = Math.max(...sortedAllObjekts.map((a) => a.serial));
    let nextSerial = maxSerial + 1;

    sortedAllObjekts.forEach((obj, idx) => {
      if (obj.serial === 0 && !(idx === 0 && !isNew)) {
        updates.push({ id: obj.id, newSerial: nextSerial++ });
      }
    });

    if (updates.length === 0) {
      console.log(`[populateSerial] Collection ${collectionId}: No updates needed`);
      return;
    }

    console.log(`[populateSerial] Collection ${collectionId}: Updating ${updates.length} objekts`);

    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      await Promise.all(
        batch.map((update) =>
          tx.update(objekts).set({ serial: update.newSerial }).where(eq(objekts.id, update.id)),
        ),
      );
    }

    console.log(`[populateSerial] Collection ${collectionId}: Updated ${updates.length} objekts`);
  });
}

export async function populateSerialOffline() {
  const affectedCollections = await indexer
    .selectDistinctOn([collections.id], { id: collections.id })
    .from(collections)
    .innerJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(and(eq(objekts.serial, 0), eq(collections.onOffline, "offline")));

  if (affectedCollections.length === 0) {
    console.log("[populateSerialOffline] No collections with zero serials found");
    return;
  }

  console.log(
    `[populateSerialOffline] Found ${affectedCollections.length} collections with zero serials`,
  );

  for (const { id: collectionId } of affectedCollections) {
    await processCollectionOffline(collectionId);
  }

  console.log("[populateSerialOffline] Done");
}

async function processCollectionOffline(collectionId: string) {
  await indexer.transaction(async (tx) => {
    const knownObjekts = await tx
      .select({ id: objekts.id, serial: objekts.serial })
      .from(objekts)
      .where(and(eq(objekts.collectionId, collectionId), gt(objekts.serial, 0)))
      .orderBy(asc(objekts.id));

    if (knownObjekts.length === 0) {
      console.log(
        `[populateSerialOffline] Collection ${collectionId}: No known serials to reference`,
      );
      return;
    }

    const zeroObjekts = await tx
      .select({ id: objekts.id })
      .from(objekts)
      .where(and(eq(objekts.collectionId, collectionId), eq(objekts.serial, 0)));

    if (zeroObjekts.length === 0) {
      return;
    }

    const updates: { id: string; newSerial: number }[] = [];

    for (const zeroObj of zeroObjekts) {
      const zeroId = parseInt(zeroObj.id);

      let closest: { id: string; serial: number } | null = null;
      let minDistance = Infinity;

      for (const known of knownObjekts) {
        const knownId = parseInt(known.id);
        const distance = Math.abs(knownId - zeroId);
        if (distance < minDistance) {
          minDistance = distance;
          closest = known;
        }
      }

      if (closest) {
        const closestId = parseInt(closest.id);
        const newSerial = closest.serial - (closestId - zeroId);

        if (newSerial > 0) {
          updates.push({ id: zeroObj.id, newSerial });
        }
      }
    }

    if (updates.length === 0) {
      console.log(`[populateSerialOffline] Collection ${collectionId}: No valid updates`);
      return;
    }

    console.log(
      `[populateSerialOffline] Collection ${collectionId}: Updating ${updates.length} objekts`,
    );

    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await Promise.all(
        batch.map((update) =>
          tx.update(objekts).set({ serial: update.newSerial }).where(eq(objekts.id, update.id)),
        ),
      );
    }

    console.log(
      `[populateSerialOffline] Collection ${collectionId}: Updated ${updates.length} objekts`,
    );
  });
}
