import { CaretRightIcon } from "@phosphor-icons/react";
import type { OfferView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";

import { offerNo, offerStatusText, offerSummary } from "./format";
import { Mono } from "./mono";
import { OfferBody } from "./offer-body";
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
  hydrated,
  onCounter,
  onOpen,
}: {
  offer: OfferView;
  /** the partner */
  name: string;
  collections: Collections;
  collapsed: boolean;
  hydrated: boolean;
  onCounter: (offer: OfferView) => void;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  if (!collapsed) {
    return (
      <div className="bg-card @container w-115 max-w-full rounded-lg border">
        <OfferBody
          offer={offer}
          name={name}
          collections={collections}
          hydrated={hydrated}
          onCounter={onCounter}
          onOpen={onOpen}
        />
      </div>
    );
  }

  return (
    <Collapsible className="bg-card @container w-115 max-w-full rounded-lg border">
      <CollapsibleTrigger className="group focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm outline-none focus-visible:ring-2">
        <CaretRightIcon
          aria-hidden
          className="text-muted-foreground size-3.5 shrink-0 transition-transform group-data-panel-open:rotate-90"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline gap-2">
            <Mono className="text-xs font-medium">{offerNo(offer.id)}</Mono>
            <span className="text-muted-foreground text-xs">{offerStatusText(offer)}</span>
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {offerSummary(offer, collections)}
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="border-t">
          <OfferBody
            offer={offer}
            name={name}
            collections={collections}
            hydrated={hydrated}
            onCounter={onCounter}
            onOpen={onOpen}
          />
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
