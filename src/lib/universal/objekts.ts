import type { Collection, Objekt } from "@/lib/server/db/indexer/schema";

export type IndexedObjekt = Collection;
export type IndexedCosmoResponse = {
  hasNext: boolean;
  total: number;
  nextStartAfter?: number;
  objekts: IndexedObjekt[];
};
export type ValidObjekt = OwnedObjekt | IndexedObjekt;

export function getCollectionShortId(objekt: ValidObjekt) {
  return `${objekt.member} ${getSeasonCollectionNo(objekt)}`;
}

export function getSeasonCollectionNo(objekt: ValidObjekt) {
  return `${objekt.season.charAt(0)}${objekt.collectionNo}`;
}

export type OwnedObjektsResult = {
  hasNext: boolean;
  nextStartAfter?: number;
  objekts: OwnedObjekt[];
};

export type OwnedObjekt = Omit<IndexedObjekt, "id"> &
  Pick<Objekt, "mintedAt" | "receivedAt" | "serial" | "id">;
