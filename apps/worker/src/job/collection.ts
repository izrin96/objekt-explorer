import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, eq } from "drizzle-orm";

import { fetchMetadata, type MetadataV1 } from "../lib/metadata-utils";

async function processObjekt(objekt: { id: string }) {
  // fetch metadata
  const metadata = await fetchMetadata(objekt.id);

  if (metadata === null) return;

  const slug = metadata.objekt.collectionId
    .toLowerCase()
    // replace diacritics
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // remove non-alphanumeric characters
    .replace(/[^\w\s-]/g, "")
    // replace spaces with hyphens
    .replace(/\s+/g, "-");

  // find correct collection
  const collectionResult = await indexer
    .select({
      id: collections.id,
    })
    .from(collections)
    .where(eq(collections.slug, slug));

  const collection = collectionResult.at(0);

  // if not found, skip, just wait indexer processor create it
  // rarely happen
  if (!collection) return;

  // optional
  // await updateCollectionMetadata(slug, metadata);

  // update objekt
  await indexer
    .update(objekts)
    .set({
      serial: metadata.objekt.objektNo,
      transferable: metadata.objekt.transferable,
      collectionId: collection.id,
    })
    .where(eq(objekts.id, objekt.id));

  console.log(`Update missing metadata for token ID ${objekt.id}`);
}

export async function fixObjektMetadata() {
  // find objekt that have missing metadata
  const objektsResults = await indexer
    .select({
      id: objekts.id,
    })
    .from(objekts)
    .leftJoin(collections, eq(objekts.collectionId, collections.id))
    .where(and(eq(collections.slug, "empty-collection")));

  await Promise.all(objektsResults.map((objekt) => processObjekt(objekt)));
}

export async function updateCollectionMetadata(slug: string, metadata: MetadataV1) {
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
