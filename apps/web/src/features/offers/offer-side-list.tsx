import type { OfferItemView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { ItemLabel } from "./item-label";
import { OfferThumb } from "./offer-item";
import { type Collections, pickKey } from "./pick";

/** a long side shows this many rows until it is opened, so the card stays short in the thread */
const SIDE_PREVIEW = 6;

export function OfferSideList({
  label,
  items,
  collections,
  onOpen,
}: {
  label: string;
  items: OfferItemView[];
  collections: Collections;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, SIDE_PREVIEW);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1.5">
      <h4
        id={headingId}
        className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
      >
        {label}
      </h4>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.offer_side_nothing()}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shown.map((item) => (
            <li key={pickKey(item)} className="flex min-w-0 items-center gap-2.5">
              <OfferThumb
                slug={item.collectionSlug}
                collection={collections[item.collectionSlug]}
                onOpen={onOpen}
                className="w-9"
              />
              <span className="min-w-0 text-sm break-words">
                <ItemLabel item={item} collections={collections} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {items.length > shown.length ? (
        <Button variant="ghost" size="xs" className="self-start" onClick={() => setExpanded(true)}>
          {m.offer_side_more({ count: items.length - shown.length })}
        </Button>
      ) : null}
    </section>
  );
}
