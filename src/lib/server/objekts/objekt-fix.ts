import { eq } from "drizzle-orm";
import { indexerWritable as indexer } from "../db/indexer";
import { collections, objekts } from "../db/indexer/schema";
import { fetchMetadata } from "./objekt-metadata";

export async function fixObjektSerial() {
  // get all objekts from new db
  const objektsResults = await indexer
    .select({
      id: objekts.id,
      serial: objekts.serial,
    })
    .from(objekts)
    .where(eq(objekts.serial, 0));

  for (const objekt of objektsResults) {
    // get metadata
    const metadata = await fetchMetadata(objekt.id.toString());

    if (!metadata) continue;

    // update objekt
    await indexer
      .update(objekts)
      .set({
        serial: metadata.objekt.objektNo,
        transferable: metadata.objekt.transferable,
      })
      .where(eq(objekts.id, objekt.id));
  }
}

export async function fixCollection() {
  const collectionsResults = await indexer
    .select({
      id: collections.id,
    })
    .from(collections)
    .where(eq(collections.backImage, ""));

  for (const collection of collectionsResults) {
    // find tokenId
    const objektsResults = await indexer
      .select({
        tokenId: objekts.id,
      })
      .from(objekts)
      .where(eq(objekts.collectionId, collection.id))
      .limit(1);

    // get metadata
    const metadata = await fetchMetadata(objektsResults[0].tokenId.toString());

    if (!metadata) continue;

    // update collection
    await indexer
      .update(collections)
      .set({
        season: metadata.objekt.season,
        member: metadata.objekt.member,
        artist: metadata.objekt.artists[0].toLowerCase(),
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
      .where(eq(collections.id, collection.id));
  }
}
