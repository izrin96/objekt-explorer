import type { ValidObjekt } from "@repo/lib/types/objekt";

import { getCollectionShortNo } from "./objekt-utils";

/** "DaHyun A201Z", the code the cards print; the slug while the collection is unknown. */
export function collectionName(slug: string, collection: ValidObjekt | undefined) {
  return collection ? `${collection.member} ${getCollectionShortNo(collection)}` : slug;
}

/** `collectionName` with the code and serial in mono, as data is set everywhere else. */
export function CollectionLabel({
  slug,
  collection,
  serial,
}: {
  slug: string;
  collection: ValidObjekt | undefined;
  serial?: number | null;
}) {
  return (
    <>
      {collection ? (
        <>
          {collection.member}{" "}
          <span className="font-mono whitespace-nowrap">{getCollectionShortNo(collection)}</span>
        </>
      ) : (
        <span className="font-mono break-all">{slug}</span>
      )}
      {serial !== undefined && serial !== null ? (
        <>
          {" "}
          <span className="font-mono whitespace-nowrap tabular-nums">#{serial}</span>
        </>
      ) : null}
    </>
  );
}
