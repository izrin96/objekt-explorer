import { CheckIcon } from "@phosphor-icons/react";
import type { OfferItemView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useId, useState } from "react";

import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { itemLabel } from "./format";
import { ItemLabel } from "./item-label";
import { ObjektTile } from "./objekt-tile";
import { OfferThumb } from "./offer-item";
import { type Collections, pickKey } from "./pick";
import { groupRows } from "./quantity";

/** a side shows this many tiles; past it, one fewer and a "+N" tile for the rest */
const SIDE_TILES = 12;

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const rows = groupRows(items, pickKey);
  const shown = rows.length > SIDE_TILES ? rows.slice(0, SIDE_TILES - 1) : rows;
  const more = rows.length - shown.length;
  const showAll = m.offer_side_all({
    count: items.length.toLocaleString(getLocale()),
    side: label,
  });
  const sent = (item: OfferItemView) => open && item.sentAt !== null;
  const tileLabel = (item: OfferItemView, count: number) =>
    [
      itemLabel(item, collections),
      count > 1 ? m.offer_any_copy_times({ count }) : null,
      sent(item) ? m.offer_item_sent() : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-1.5">
      <h4 id={headingId} className="text-xs font-medium">
        {items.length > 0 ? (
          <button
            type="button"
            aria-label={showAll}
            onClick={() => setSheetOpen(true)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm tracking-wide uppercase outline-none focus-visible:ring-2"
          >
            {label} · <span className="tabular-nums">{items.length}</span>
          </button>
        ) : (
          <span className="text-muted-foreground tracking-wide uppercase">{label}</span>
        )}
      </h4>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.offer_side_nothing()}</p>
      ) : (
        <ul className="grid grid-cols-4 gap-1 @max-md:grid-cols-6">
          {shown.map(({ key, item, count }) => (
            <li key={key} className="min-w-0">
              <ObjektTile
                compact
                slug={item.collectionSlug}
                collection={collections[item.collectionSlug]}
                serial={null}
                label={tileLabel(item, count)}
                times={count}
                mark={
                  sent(item)
                    ? { tone: "success", icon: CheckIcon, label: m.offer_item_sent() }
                    : undefined
                }
                onOpen={onOpen}
              />
            </li>
          ))}
          {more > 0 ? (
            <li className="min-w-0">
              <button
                type="button"
                aria-label={showAll}
                onClick={() => setSheetOpen(true)}
                className="text-foreground hover:bg-accent/60 focus-visible:ring-ring rounded-photocard aspect-photocard grid w-full place-items-center border border-dashed text-xs font-semibold tabular-nums outline-none focus-visible:ring-2"
              >
                +{more}
              </button>
            </li>
          ) : null}
        </ul>
      )}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetPopup>
          <SheetHeader>
            <SheetTitle className="text-base">
              {label} · <span className="tabular-nums">{items.length}</span>
            </SheetTitle>
          </SheetHeader>
          <SheetPanel>
            <ul className="flex flex-col">
              {rows.map(({ key, item, count }) => (
                <li
                  key={key}
                  className="flex min-w-0 items-center gap-3 border-b py-1.5 last:border-b-0"
                >
                  <OfferThumb
                    slug={item.collectionSlug}
                    collection={collections[item.collectionSlug]}
                    onOpen={onOpen}
                    className="w-9"
                  />
                  <span className="min-w-0 flex-1 text-sm break-words">
                    <ItemLabel item={item} collections={collections} />
                    {count > 1 ? (
                      <span className="text-muted-foreground tabular-nums">
                        {" "}
                        {m.offer_any_copy_times({ count })}
                      </span>
                    ) : null}
                    {sent(item) ? (
                      <span className="text-success-foreground block text-xs">
                        {m.offer_item_sent()}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </SheetPanel>
        </SheetPopup>
      </Sheet>
    </section>
  );
}
