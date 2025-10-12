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
  const bandImageUrl = getBandImageUrl(collection);

  return {
    ...collection,
    backgroundColor: accentColor ?? collection.backgroundColor,
    textColor: fontColor ?? collection.textColor,
    bandImageUrl,
  };
}

function getBandImageUrl(objekt: ValidObjekt) {
  if (objekt.bandImageUrl) return objekt.bandImageUrl;

  if (objekt.artist === "idntt") {
    if (objekt.class === "Special") {
      objekt.bandImageUrl =
        "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/86207a80d354439cada0ec6c45e076ee20250814061643330.png";
    }

    if (objekt.class === "Unit") {
      objekt.bandImageUrl =
        "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/e0e4fdd950bc4ca8ba49a98b053756f620250814065358420.png";
    }

    if (objekt.onOffline === "offline" && objekt.backgroundColor === "#000000") {
      objekt.bandImageUrl =
        "https://resources.cosmo.fans/images/collection-band/2025/07/12/04/raw/fab4f9ec98d24a00a7c417e012a493cd20250712042141653.png";
    }
  }

  return objekt.bandImageUrl;
}

export function getObjektImageUrls(objekt: ValidObjekt) {
  return {
    resizedUrl: replaceUrlSize(objekt.frontImage),
    originalUrl: replaceUrlSize(objekt.frontImage, "original"),
    backUrl: replaceUrlSize(objekt.backImage, "original"),
  };
}
