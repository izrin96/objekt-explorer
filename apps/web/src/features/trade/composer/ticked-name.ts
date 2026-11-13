import type { ValidObjekt } from "@repo/lib/types/objekt";

import { collectionName } from "@/features/objekt/collection-name";
import { isObjektOwned } from "@/features/objekt/objekt-utils";

/** "Lynn SCO #12": two copies of one collection read apart by their serial. */
export function tickedName(objekt: ValidObjekt) {
  const base = collectionName(objekt.slug, objekt);
  return isObjektOwned(objekt) ? `${base} #${objekt.serial}` : base;
}
