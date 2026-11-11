import type { ValidObjekt } from "@repo/lib/types/objekt";

import { getCollectionShortNo } from "./objekt-utils";

/** "DaHyun A201Z", the code the cards print; the slug while the collection is unknown. */
export function collectionName(
  slug: string,
  collection: Pick<ValidObjekt, "member" | "artist" | "season" | "collectionNo"> | undefined,
) {
  return collection ? `${collection.member} ${getCollectionShortNo(collection)}` : slug;
}
