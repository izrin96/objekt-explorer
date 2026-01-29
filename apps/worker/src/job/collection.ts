import type { CosmoObjektMetadataV1 } from "@repo/cosmo/types/metadata";

import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { slugifyObjekt } from "@repo/lib";
import { eq } from "drizzle-orm";

import { fetchMetadata } from "../lib/metadata-utils";

const enableUpdateMetadata = false;

/**
 * Fix all missing metadata for all objekt in 'empty-collection'
 */
export async function fixObjektMetadata() {
  // find objekt that have missing metadata
  const objektsResults = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(eq(collections.slug, "empty-collection"));

  for (const objekt of objektsResults) {
    await processObjekt(objekt);
  }
}

/**
 * Fix all objekt with serial 0
 */
export async function fixObjektSerialZero() {
  const objektsResults = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .where(eq(objekts.serial, 0));

  for (const objekt of objektsResults) {
    await processObjekt(objekt);
  }
}

/**
 * Fetch metadata for an objekt
 */
async function processObjekt(objekt: { id: string }) {
  // fetch metadata
  const metadata = await fetchMetadata(objekt.id);

  if (metadata === null) return;

  const slug = slugifyObjekt(metadata.objekt.collectionId);

  // find correct collection
  const [collection] = await indexer
    .select({
      id: collections.id,
    })
    .from(collections)
    .where(eq(collections.slug, slug));

  // if not found, skip, just wait indexer processor create it
  // rarely happen
  if (!collection) {
    console.log(`Collection not yet exist for token ID ${objekt.id}`);
    return;
  }

  // optional: force update metadata
  if (enableUpdateMetadata) {
    await updateCollectionMetadata(slug, metadata);
  }

  // update objekt
  await indexer
    .update(objekts)
    .set({
      serial: metadata.objekt.objektNo,
      transferable: metadata.objekt.transferable,
      collectionId: collection.id,
    })
    .where(eq(objekts.id, objekt.id));

  // update transfer
  await indexer
    .update(transfers)
    .set({
      collectionId: collection.id,
    })
    .where(eq(transfers.objektId, objekt.id));

  console.log(`Update missing metadata for token ID ${objekt.id}`);
}

/**
 * Update collection metadata
 */
async function updateCollectionMetadata(slug: string, metadata: CosmoObjektMetadataV1) {
  // update collection metadata
  await indexer
    .update(collections)
    .set({
      season: metadata.objekt.season,
      member: metadata.objekt.member,
      artist: metadata.objekt.artists[0]!.toLowerCase(),
      collectionNo: metadata.objekt.collectionNo,
      class: metadata.objekt.class,
      comoAmount: metadata.objekt.comoAmount,
      onOffline: metadata.objekt.collectionNo.includes("Z") ? "online" : "offline",
      thumbnailImage: metadata.objekt.thumbnailImage,
      frontImage: metadata.objekt.frontImage,
      backImage: metadata.objekt.backImage,
      backgroundColor: metadata.objekt.backgroundColor,
      textColor: metadata.objekt.textColor,
      accentColor: metadata.objekt.accentColor,
    })
    .where(eq(collections.slug, slug));
}
