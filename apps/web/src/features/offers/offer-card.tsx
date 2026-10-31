import { ArrowsLeftRightIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { OfferItemView, OfferView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";

import { offerLine, offerNo, offerSummary } from "./format";
import { Mono } from "./mono";
import { OfferBody } from "./offer-body";
import { OfferThumb } from "./offer-item";
import type { Collections } from "./pick";

/**
 * Read live like the rest of the thread. Only the conversation's newest offer is drawn in full;
 * an older one is a line that opens to the same card.
 */
export function OfferCard({
  offer,
  name,
  collections,
  collapsed,
  onCounter,
  onOpen,
}: {
  offer: OfferView;
  /** the partner */
  name: string;
  collections: Collections;
  collapsed: boolean;
  onCounter: (offer: OfferView) => void;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const line = offerLine(offer);
  // the deal strip moves focus here (`useJumpToMessage`); never in the tab order
  const target = {
    tabIndex: -1,
    "data-offer-id": offer.id,
    className:
      "bg-card @container focus-visible:ring-ring w-115 max-w-full rounded-lg border outline-none focus-visible:ring-2",
  };

  if (!collapsed) {
    return (
      <div {...target}>
        <OfferBody
          offer={offer}
          name={name}
          collections={collections}
          onCounter={onCounter}
          onOpen={onOpen}
        />
      </div>
    );
  }

  return (
    <Collapsible {...target}>
      <CollapsibleTrigger className="group focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm outline-none focus-visible:ring-2">
        <CaretRightIcon
          aria-hidden
          className="text-muted-foreground size-3.5 shrink-0 transition-transform group-data-panel-open:rotate-90"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-baseline gap-2">
            <Mono className="shrink-0 text-xs font-medium whitespace-nowrap">
              {offerNo(offer.id)}
            </Mono>
            <span className={cn("min-w-0 truncate text-xs", TONE_INK[line.tone])}>{line.text}</span>
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {offerSummary(offer, collections)}
          </span>
        </span>
        <ThumbStrip give={offer.give} get={offer.get} collections={collections} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="border-t">
          <OfferBody
            offer={offer}
            name={name}
            collections={collections}
            onCounter={onCounter}
            onOpen={onOpen}
          />
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}

/** Up to three of each side, so an older offer is recognisable without opening it. */
const THUMBS_PER_SIDE = 3;

function ThumbStrip({
  give,
  get,
  collections,
}: {
  give: OfferItemView[];
  get: OfferItemView[];
  collections: Collections;
}) {
  const side = (items: OfferItemView[]) => (
    <span className="flex items-center gap-1">
      {items.slice(0, THUMBS_PER_SIDE).map((item, i) => (
        <OfferThumb
          key={i}
          slug={item.collectionSlug}
          collection={collections[item.collectionSlug]}
          className="w-6"
        />
      ))}
    </span>
  );
  const counted = give.length > THUMBS_PER_SIDE || get.length > THUMBS_PER_SIDE;
  return (
    // the summary beside it already says all of this
    <span aria-hidden className="flex shrink-0 items-center gap-1.5">
      {side(give)}
      {counted ? (
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {give.length} ⇄ {get.length}
        </span>
      ) : (
        <ArrowsLeftRightIcon className="text-muted-foreground size-3.5" />
      )}
      {side(get)}
    </span>
  );
}
