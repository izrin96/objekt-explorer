import type { OfferItemView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { CollectionLabel } from "@/features/objekt/objekt-label";
import { m } from "@/paraglide/messages";

/** stands in for the name, so each locale keeps its own word order around it */
const SLOT = "";

/** `itemLabel` as markup: "SeoYeon A204Z #537", or "SeoYeon A204Z (any copy)". The moderation console passes no `serialEstimated`. */
export function ItemLabel({
  item,
  collections,
}: {
  item: Pick<OfferItemView, "collectionSlug" | "objektId" | "serial"> &
    Partial<Pick<OfferItemView, "serialEstimated">>;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
}) {
  const name = (
    <CollectionLabel
      slug={item.collectionSlug}
      collection={collections[item.collectionSlug]}
      serial={item.objektId === null ? null : item.serial}
      estimated={item.serialEstimated}
    />
  );
  if (item.objektId !== null) return name;
  const [before, after] = m.offer_item_any({ name: SLOT }).split(SLOT);
  return (
    <>
      {before}
      {name}
      {after}
    </>
  );
}
