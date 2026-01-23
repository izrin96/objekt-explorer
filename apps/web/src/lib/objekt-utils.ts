import {
  type OwnedObjekt,
  type PinObjekt,
  shortformMembers,
  type ValidObjekt,
} from "@repo/lib/objekts";

import { getCollectionEdition } from "./universal/collection-grid";
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

export function mapObjektWithPinLock(
  objekt: ValidObjekt,
  pins: PinObjekt[],
  locked: PinObjekt[],
): ValidObjekt {
  if (!isObjektOwned(objekt)) return objekt;

  const pinObjekt = pins.find((pin) => pin.tokenId === objekt.id);
  const lockedObjekt = locked.find((lock) => lock.tokenId === objekt.id);
  const isPin = pinObjekt !== undefined;
  const isLocked = lockedObjekt !== undefined;
  return {
    ...objekt,
    isPin,
    isLocked,
    pinOrder: isPin ? pinObjekt.order : null,
  } satisfies OwnedObjekt;
}

export function mapObjektWithTag<T extends ValidObjekt>(objekt: T): T {
  return {
    ...objekt,
    tags: makeCollectionTags(objekt),
    edition: getCollectionEdition(objekt),
  };
}

export function isObjektOwned(objekt: ValidObjekt) {
  return "serial" in objekt;
}

export function getObjektImageUrls(objekt: ValidObjekt) {
  return {
    resizedUrl: replaceUrlSize(objekt.frontImage),
    originalUrl: replaceUrlSize(objekt.frontImage, "original"),
    backUrl: replaceUrlSize(objekt.backImage, "original"),
  };
}
