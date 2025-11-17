import type { ValidObjekt } from "./objekts";

function getScoEdition(objekt: ValidObjekt, collection: number) {
  // atom01 sco for 2nd and 3rd edition start from 216z
  if (objekt.season === "Atom01" && [201, 202].includes(collection) === false) {
    if ([216, 217].includes(collection)) {
      return 2;
    }
    if ([218, 219].includes(collection)) {
      return 3;
    }
    return null;
  }

  if ([201, 202].includes(collection)) {
    return 1;
  }
  if ([203, 204].includes(collection)) {
    return 2;
  }
  if ([205, 206].includes(collection)) {
    return 3;
  }
  return null;
}

function getFirstEdition(collection: number) {
  if (collection >= 101 && collection <= 108) {
    return 1;
  }
  if (collection >= 109 && collection <= 116) {
    return 2;
  }
  if (collection >= 117 && collection <= 120) {
    return 3;
  }
  return null;
}

export function getCollectionEdition(objekt: ValidObjekt) {
  if (objekt.artist === "idntt") {
    return null;
  }
  const collection = parseInt(objekt.collectionNo);
  const edition =
    objekt.class === "Special" && objekt.onOffline === "online"
      ? getScoEdition(objekt, collection)
      : objekt.class === "First"
        ? getFirstEdition(collection)
        : null;
  return edition;
}
