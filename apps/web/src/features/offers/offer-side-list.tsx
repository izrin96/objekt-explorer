import type { OfferItemView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { ItemLabel } from "./item-label";
import { OfferThumb } from "./offer-item";
import { type Collections, pickKey } from "./pick";
import { groupRows } from "./quantity";

/** a long side shows this many rows until it is opened, so the card stays short in the thread */
const SIDE_PREVIEW = 6;

export function OfferSideList({
  label,
  items,
  collections,
  open,
  onOpen,
}: {
  label: string;
  items: OfferItemView[];
  collections: Collections;
  /** the offer is open: only then do "already sent" marks show */
  open: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const rows = groupRows(items, pickKey);
  const shown = expanded ? rows : rows.slice(0, SIDE_PREVIEW);
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
          {shown.map(({ key, item, count }) => (
            <li key={key} className="flex min-w-0 items-center gap-2.5">
              <OfferThumb
                slug={item.collectionSlug}
                collection={collections[item.collectionSlug]}
                onOpen={onOpen}
                className="w-9"
              />
              <span className="min-w-0 text-sm break-words">
                <ItemLabel item={item} collections={collections} />
                {count > 1 ? (
                  <span className="text-muted-foreground tabular-nums">
                    {" "}
                    {m.offer_any_copy_times({ count })}
                  </span>
                ) : null}
                {open && item.sentAt !== null ? (
                  <span className="text-success-foreground block text-xs">
                    {m.offer_item_sent()}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > shown.length ? (
        <Button variant="ghost" size="xs" className="self-start" onClick={() => setExpanded(true)}>
          {m.offer_side_more({ count: rows.length - shown.length })}
        </Button>
      ) : null}
    </section>
  );
}
