import type { ValidObjekt } from "@repo/lib/types/objekt";

import { m } from "@/paraglide/messages";

import { getCollectionShortNo } from "./objekt-utils";

/** "DaHyun A201Z", the code the cards print; the slug while the collection is unknown. */
export function collectionName(
  slug: string,
  collection: Pick<ValidObjekt, "member" | "artist" | "season" | "collectionNo"> | undefined,
) {
  return collection ? `${collection.member} ${getCollectionShortNo(collection)}` : slug;
}

/** "#537", or "~#537" read as "estimated #537" when we computed the serial, not Cosmo. */
export function SerialNo({ serial, estimated }: { serial: number; estimated?: boolean }) {
  return (
    <span className="font-mono whitespace-nowrap tabular-nums">
      {estimated ? (
        <>
          <span aria-hidden="true">~</span>
          <span className="sr-only">{m.offer_serial_estimated()} </span>
        </>
      ) : null}
      #{serial}
    </span>
  );
}

/** `collectionName` with the code and serial in mono, as data is set everywhere else. */
export function CollectionLabel({
  slug,
  collection,
  serial,
  estimated,
}: {
  slug: string;
  collection: ValidObjekt | undefined;
  serial?: number | null;
  estimated?: boolean;
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
          <SerialNo serial={serial} estimated={estimated} />
        </>
      ) : null}
    </>
  );
}
