import type { Objekt } from "./server/db/indexer/schema";
import {
  type IndexedObjekt,
  type OwnedObjekt,
  overrideAccents,
  overrideFonts,
  shortformMembers,
  type ValidObjekt,
} from "./universal/objekts";
import { replaceUrlSize } from "./utils";

function getMemberShortKeys(value: string) {
  return Object.keys(shortformMembers).filter((key) => shortformMembers[key] === value);
}

export function getCollectionShortId(objekt: ValidObjekt) {
  if (objekt.artist === "idntt") {
    return `${objekt.member} ${objekt.season} ${objekt.collectionNo}`;
  }
  const seasonNumber = Number(objekt.season.slice(-2));
  if (seasonNumber <= 1) return `${objekt.member} ${objekt.season.charAt(0)}${objekt.collectionNo}`;
  return `${objekt.member} ${objekt.season.charAt(0)}${seasonNumber} ${objekt.collectionNo}`;
}

function makeCollectionTags(objekt: ValidObjekt) {
  const seasonCode = objekt.season.charAt(0);
  const seasonNumber = objekt.season.slice(-2);
  const seasonCodeRepeated = seasonCode.repeat(Number(seasonNumber));
  const collectionNoSliced = objekt.collectionNo.slice(0, -1);

  return [
    ...getMemberShortKeys(objekt.member),
    objekt.artist,
    objekt.collectionNo, // 201z
    `${seasonCodeRepeated}${objekt.collectionNo}`, // a201z, aa201z
    `${seasonCodeRepeated}${collectionNoSliced}`, // a201, aa201
    collectionNoSliced, // 201
    objekt.member,
    objekt.class, // special
    `${objekt.class.charAt(0)}co`, // sco
    objekt.season, // atom01
    objekt.season.slice(0, -2), // atom
    seasonCode + seasonNumber, // a01
    seasonCode + Number(seasonNumber), // a1
  ].map((a) => a.toLowerCase());
}

export function mapOwnedObjekt(objekt: Objekt, collection: IndexedObjekt): OwnedObjekt {
  return {
    ...collection,
    ...overrideCollection(collection),
    id: objekt.id.toString(),
    serial: objekt.serial,
    receivedAt: objekt.receivedAt,
    mintedAt: objekt.mintedAt,
    transferable: objekt.transferable,
  };
}

export function mapObjektWithTag(objekt: ValidObjekt): ValidObjekt {
  return {
    ...objekt,
    tags: makeCollectionTags(objekt),
  };
}

export function overrideCollection(collection: IndexedObjekt) {
  // temporary fix accent color for some collection
  const accentColor = overrideAccents[collection.slug];
  const fontColor = overrideFonts[collection.slug];

  return {
    backgroundColor: accentColor ?? collection.backgroundColor,
    textColor: fontColor ?? collection.textColor,
  };
}

export function getObjektImageUrls(objekt: ValidObjekt) {
  return {
    resizedUrl: replaceUrlSize(objekt.frontImage),
    originalUrl: replaceUrlSize(objekt.frontImage, "original"),
    backUrl: replaceUrlSize(objekt.backImage, "original"),
  };
}
