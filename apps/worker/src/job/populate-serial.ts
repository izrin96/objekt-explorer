import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { slugifyObjekt } from "@repo/lib";
import { and, eq, asc, gt, ne, notInArray, inArray, or } from "drizzle-orm";
import { FetchError } from "ofetch";

// collection that already pre-assigned tokenId
// this collection should calculate serial by tokenId instead
// just like offline objekt
const excludeCollections = [
  "cream02-jiyeon-315z",
  "cream02-kotone-315z",
  "cream02-hayeon-315z",
  "cream02-jiwoo-315z",
  "cream02-xinyu-315z",
  "cream02-yeonji-315z",
];

export async function populateSerial() {
  const collectionDiscover = await indexer
    .selectDistinctOn([collections.id], { id: collections.id })
    .from(collections)
    .innerJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.serial, 0),
        eq(collections.onOffline, "online"),
        ne(collections.slug, "empty-collection"),
        // skip collection that already pre-assigned tokenId
        notInArray(collections.slug, excludeCollections),
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
  const allObjekts = await indexer
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

  // for now skip newer collections
  // because some collection is pre-assigned tokenId
  // just like offline objekt
  if (isNew) return;

  const maxSerial = Math.max(...sortedAllObjekts.map((a) => a.serial));
  let nextSerial = maxSerial + 1;

  sortedAllObjekts.forEach((obj, idx) => {
    // old collection (already contain non-zero objekt)
    // might start from serial zero, skip those serial zero objekt
    // unless its a new collection
    if (obj.serial === 0 && !(idx === 0 && !isNew)) {
      updates.push({ id: obj.id, newSerial: nextSerial++ });
    }
  });

  if (updates.length === 0) {
    console.log(`[populateSerial] Collection ${collectionId}: No updates needed`);
    return;
  }

  await indexer.transaction(async (tx) => {
    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      for (const update of batch) {
        await tx.update(objekts).set({ serial: update.newSerial }).where(eq(objekts.id, update.id));
      }
    }
  });

  console.log(`[populateSerial] Collection ${collectionId}: Updated ${updates.length} objekts`);
}

const BATCH_SIZE = 20;

export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: -1,
): Promise<number | null>;
export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: 1,
): Promise<number>;
export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: -1 | 1,
): Promise<number | null> {
  const targetSlug = slugifyObjekt(targetCollectionId);

  for (let offset = 0; ; offset += BATCH_SIZE) {
    const batch: number[] = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const tokenId = startTokenId + direction * (offset + i + 1);
      if (direction === -1 && tokenId < 1) break;
      batch.push(tokenId);
    }

    if (batch.length === 0) break;

    const results = await Promise.all(
      batch.map(async (tokenId) => {
        try {
          const raw = await fetchMetadataV3(String(tokenId));
          const metadata = normalizeV3(raw, String(tokenId));
          return { tokenId, slug: slugifyObjekt(metadata.objekt.collectionId) };
        } catch (error) {
          if (error instanceof FetchError && error.status === 404) {
            return { tokenId, slug: null };
          }
          throw error;
        }
      }),
    );

    for (const result of results) {
      if (result.slug === null) continue;
      if (result.slug !== targetSlug) {
        return result.tokenId - direction;
      }
    }
  }

  return null;
}

export async function populateSerialOffline() {
  const affectedCollections = await indexer
    .selectDistinctOn([collections.id], { id: collections.id })
    .from(collections)
    .innerJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(
      or(
        and(
          eq(objekts.serial, 0),
          eq(collections.onOffline, "offline"),
          ne(collections.slug, "empty-collection"),
        ),
        // extra collection with pre-assigned tokenId
        and(eq(objekts.serial, 0), inArray(collections.slug, excludeCollections)),
      ),
    );

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
  const knownObjekts = await indexer
    .select({ id: objekts.id, serial: objekts.serial })
    .from(objekts)
    .where(and(eq(objekts.collectionId, collectionId), gt(objekts.serial, 0)))
    .orderBy(asc(objekts.id));

  const zeroObjekts = await indexer
    .select({ id: objekts.id })
    .from(objekts)
    .where(and(eq(objekts.collectionId, collectionId), eq(objekts.serial, 0)));

  if (zeroObjekts.length === 0) {
    return;
  }

  const updates: { id: string; newSerial: number }[] = [];

  if (knownObjekts.length === 0) {
    const [collection] = await indexer
      .select({ collectionId: collections.collectionId })
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection) {
      console.log(`[populateSerialOffline] Collection ${collectionId}: Not found`);
      return;
    }

    const minTokenId = Math.min(...zeroObjekts.map((o) => parseInt(o.id)));

    try {
      const baseTokenId = await findBoundaryTokenId(collection.collectionId, minTokenId, -1);

      if (baseTokenId === null) {
        console.log(
          `[populateSerialOffline] Collection ${collectionId}: Could not determine base token ID`,
        );
        return;
      }

      for (const zeroObj of zeroObjekts) {
        const newSerial = parseInt(zeroObj.id) - baseTokenId + 1;
        if (newSerial > 0) {
          updates.push({ id: zeroObj.id, newSerial });
        }
      }
    } catch {
      console.log(`[populateSerialOffline] Collection ${collectionId}: API error, skipping`);
      return;
    }
  } else {
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
  }

  if (updates.length === 0) {
    console.log(`[populateSerialOffline] Collection ${collectionId}: No valid updates`);
    return;
  }

  await indexer.transaction(async (tx) => {
    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      for (const update of batch) {
        await tx.update(objekts).set({ serial: update.newSerial }).where(eq(objekts.id, update.id));
      }
    }
  });

  console.log(
    `[populateSerialOffline] Collection ${collectionId}: Updated ${updates.length} objekts`,
  );
}
