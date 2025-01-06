import type { Collection } from "@/lib/server/db/indexer/schema";
import { ObjektBaseFields, OwnedObjekt } from "@/lib/universal/cosmo/objekts";

export type IndexedObjekt = Collection;
export type IndexedCosmoResponse = {
  hasNext: boolean;
  total: number;
  nextStartAfter?: number;
  objekts: IndexedObjekt[];
};
export type ValidObjekt = ObjektBaseFields | OwnedObjekt | IndexedObjekt;

export function getCollectionShortId(objekt: ValidObjekt) {
  return `${objekt.member} ${getSeasonCollectionNo(objekt)}`;
}

export function getSeasonCollectionNo(objekt: ValidObjekt) {
  return `${objekt.season.charAt(0)}${objekt.collectionNo}`;
}
