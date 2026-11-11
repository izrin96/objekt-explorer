import type { ValidObjekt } from "@repo/lib/types/objekt";

import { m } from "@/paraglide/messages";

import { getCollectionShortNo } from "./objekt-utils";

/** "#537", or "~#537" read as "estimated #537" when we computed the serial, not Cosmo. */
export function SerialNo({ serial, estimated }: { serial: number; estimated?: boolean }) {
  return (
    <span className="font-mono whitespace-nowrap">
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

/** `collectionName` with the serial in mono; the code stays in the label font, where mono spaces its season and number apart. */
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
          <span className="whitespace-nowrap">{getCollectionShortNo(collection)}</span>
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
