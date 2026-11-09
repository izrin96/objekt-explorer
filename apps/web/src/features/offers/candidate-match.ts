import type { CandidateItem } from "@repo/api/schemas/offer";
import type { GridObjekt } from "@repo/lib/types/objekt";

import { searchMatcher } from "@/features/filters/filter-utils";
import { mapObjektWithTag } from "@/features/objekt/objekt-utils";

import type { Collections } from "./pick";

/**
 * The quick search over loaded candidates; the facets narrow on the server, but the search
 * reads collection tags the endpoint does not carry, so the caller pages everything in.
 */
export function candidateMatcher(search: string, collections: Collections) {
  const matches = searchMatcher(search);
  if (!matches) return null;
  const tagged = new Map<string, GridObjekt>();
  return (item: CandidateItem) => {
    const collection = collections[item.collectionSlug];
    if (!collection) return false;
    let objekt = tagged.get(item.collectionSlug);
    if (!objekt) {
      objekt = mapObjektWithTag(collection);
      tagged.set(item.collectionSlug, objekt);
    }
    // a serial term only reads an objekt that has one
    return matches(item.serial === null ? objekt : { ...objekt, serial: item.serial });
  };
}
