import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { slugifyObjekt, chunk } from "@repo/lib";
import { and, eq, asc, ne, notInArray, inArray, or, lte, sql } from "drizzle-orm";
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

const COLLECTION_CONCURRENCY = 5;
const DB_BATCH_SIZE = 500;

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

  await chunk(collectionDiscover, COLLECTION_CONCURRENCY, async (batch) => {
    await Promise.all(batch.map(({ id }) => processCollection(id)));
  });

  console.log("[populateSerial] Done");
}

async function processCollection(collectionId: string) {
  const allObjekts = await indexer
    .select({ id: objekts.id, serial: objekts.serial })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, collectionId),
        // give some delay
        lte(objekts.mintedAt, new Date(Date.now() - 120 * 1000).toISOString()),
      ),
    )
    .orderBy(asc(objekts.id));

  if (allObjekts.length === 0) {
    return;
  }

  const sorted = allObjekts.toSorted((a, b) => parseInt(a.id) - parseInt(b.id));

  const isNew = sorted.every((a) => a.serial === 0);

  if (isNew) {
    // Detect pre-assigned collections: call findBoundaryTokenId
    // backwards. If the base token matches the first objekt's tokenId,
    // the collection boundary is properly positioned — proceed.
    // Otherwise it's a pre-assigned collection — skip.
    const [collection] = await indexer
      .select({ collectionId: collections.collectionId })
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection) return;

    const firstTokenId = parseInt(sorted[0]!.id);
    const baseTokenId = await findBoundaryTokenId(collection.collectionId, firstTokenId, -1);

    if (baseTokenId !== firstTokenId) {
      console.log(`[populateSerial] Collection ${collectionId}: Pre-assigned, skipping`);
      return;
    }
  }

  const maxSerial = Math.max(...sorted.map((a) => a.serial));
  let nextSerial = maxSerial + 1;

  const updates: { id: string; newSerial: number }[] = [];

  sorted.forEach((obj, idx) => {
    // old collection (already contain non-zero objekt)
    // might start from serial zero, skip those serial zero objekt
    // unless its a new collection
    if (obj.serial === 0 && !(idx === 0 && !isNew)) {
      updates.push({ id: obj.id, newSerial: nextSerial++ });
    }

    // overwrite serial
    // const newSerial = idx + 1;
    // if (obj.serial !== newSerial) {
    //   updates.push({ id: obj.id, newSerial });
    // }
  });

  if (updates.length === 0) {
    console.log(`[populateSerial] Collection ${collectionId}: No updates needed`);
    return;
  }

  await indexer.transaction(async (tx) => {
    for (let i = 0; i < updates.length; i += DB_BATCH_SIZE) {
      const batch = updates.slice(i, i + DB_BATCH_SIZE);
      const ids = batch.map((u) => u.id);
      const caseExpr = batch
        .map((u) => sql`WHEN ${u.id} THEN ${u.newSerial}`)
        .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);
      await tx
        .update(objekts)
        .set({ serial: sql`(CASE id ${caseExpr} END)::int` })
        .where(inArray(objekts.id, ids));
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
      and(
        eq(objekts.serial, 0),
        or(
          and(eq(collections.onOffline, "offline"), ne(collections.slug, "empty-collection")),
          // extra collection with pre-assigned tokenId
          inArray(collections.slug, excludeCollections),
        ),
      ),
    );

  if (affectedCollections.length === 0) {
    console.log("[populateSerialOffline] No collections with zero serials found");
    return;
  }

  console.log(
    `[populateSerialOffline] Found ${affectedCollections.length} collections with zero serials`,
  );

  await chunk(affectedCollections, COLLECTION_CONCURRENCY, async (batch) => {
    await Promise.all(batch.map(({ id }) => processCollectionOffline(id)));
  });

  console.log("[populateSerialOffline] Done");
}

async function processCollectionOffline(collectionId: string) {
  const allObjekts = await indexer
    .select({ id: objekts.id, serial: objekts.serial })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, collectionId),
        // give some delay
        lte(objekts.mintedAt, new Date(Date.now() - 120 * 1000).toISOString()),
      ),
    )
    .orderBy(asc(objekts.id));

  const knownObjekts = allObjekts.filter((o) => o.serial > 0);
  const zeroObjekts = allObjekts.filter((o) => o.serial === 0);

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
    for (let i = 0; i < updates.length; i += DB_BATCH_SIZE) {
      const batch = updates.slice(i, i + DB_BATCH_SIZE);
      const ids = batch.map((u) => u.id);
      const caseExpr = batch
        .map((u) => sql`WHEN ${u.id} THEN ${u.newSerial}`)
        .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);
      await tx
        .update(objekts)
        .set({ serial: sql`(CASE id ${caseExpr} END)::int` })
        .where(inArray(objekts.id, ids));
    }
  });

  console.log(
    `[populateSerialOffline] Collection ${collectionId}: Updated ${updates.length} objekts`,
  );
}
