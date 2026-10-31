import { WarningIcon, XIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useHydrated } from "@tanstack/react-router";
import type { Ref, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { getCollectionShortNo } from "@/features/objekt/objekt-utils";
import { TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { itemLabel, shortDate } from "./format";
import { MarkReceived } from "./mark-received";
import { type Leg, canMarkReceived } from "./next-step";
import { OfferThumb } from "./offer-item";
import type { Collections } from "./pick";
import { legView } from "./trade-exchange";
import { InPlaceOf, LegSerial, Serial, rich } from "./wrong-copy";

type Props = {
  leg: Leg;
  conversationId: number;
  ended: boolean;
  collections: Collections;
  /** the partner */
  name: string;
  onOpen: (objekt: ValidObjekt) => void;
};

/** What happens next for this objekt, in one line. */
function NextLine({
  leg,
  ended,
  name,
  warning,
}: Pick<Props, "leg" | "ended" | "name"> & {
  warning: string | null;
}) {
  if (warning) {
    return (
      <p className="text-warning-foreground flex items-start gap-1.5 text-xs text-pretty">
        <WarningIcon aria-hidden weight="fill" className="mt-px size-3.5 shrink-0" />
        {warning}
      </p>
    );
  }
  if (leg.confirmedAt !== null) {
    const date = shortDate(leg.confirmedAt);
    return (
      <p className="text-muted-foreground text-xs text-pretty">
        {leg.fromYou
          ? m.offer_leg_confirmed_by_them({ name, date })
          : m.offer_leg_confirmed_by_you({ date })}
      </p>
    );
  }
  if (leg.state === "verified") return <InPlaceOf leg={leg} />;
  if (ended) return null;
  const pending = leg.substitutes.find((copy) => copy.status === "pending");
  if (pending) {
    const sent = <Serial serial={pending.serial} estimated={pending.serialEstimated} />;
    return (
      <p className="text-warning-foreground text-xs text-pretty">
        {leg.fromYou
          ? rich(m.offer_leg_copy_sent, { sent })
          : rich(m.offer_selected_copy_they, { name, sent })}
      </p>
    );
  }
  return (
    <p className="text-muted-foreground text-xs text-pretty">
      {leg.fromYou ? m.offer_selected_send() : m.offer_selected_waiting({ name })}
    </p>
  );
}

function SelectedBody({ leg, conversationId, ended, collections, name, onOpen }: Props) {
  const hydrated = useHydrated();
  const collection = collections[leg.collectionSlug];
  const view = legView(leg, ended, collections, hydrated);
  return (
    <div className="flex gap-3.5">
      <OfferThumb slug={leg.collectionSlug} collection={collection} className="w-24" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <p className="max-w-full truncate font-medium">
          {collection?.member ?? leg.collectionSlug}
        </p>
        <p className="flex max-w-full items-baseline gap-2 font-mono text-xs">
          <span className="truncate">{collection ? getCollectionShortNo(collection) : null}</span>
          <span className="text-muted-foreground shrink-0">
            <LegSerial leg={leg} />
          </span>
        </p>
        <p className="text-xs">
          <span className="text-muted-foreground">
            {leg.fromYou ? m.offer_side_give() : m.offer_side_get()}
          </span>
          {" · "}
          <span className={cn("font-medium", TONE_INK[view.mark.tone])}>{view.mark.label}</span>
        </p>
        <NextLine leg={leg} ended={ended} name={name} warning={view.warning} />
        <div className="mt-1 flex flex-wrap gap-2">
          {collection ? (
            <Button variant="outline" size="sm" onClick={() => onOpen(collection)}>
              {m.offer_selected_view()}
            </Button>
          ) : null}
          {canMarkReceived(leg, ended) ? (
            <MarkReceived
              conversationId={conversationId}
              leg={leg}
              objekt={itemLabel(leg, collections)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** From `lg`, the side panel's first card while an objekt is selected. */
export function SelectedPanel({
  headingRef,
  ...props
}: Props & { onClose: () => void; headingRef?: Ref<HTMLHeadingElement> }) {
  return (
    <section
      aria-label={m.offer_selected_title()}
      className="bg-card flex flex-col gap-3 rounded-xl border p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 ref={headingRef} tabIndex={-1} className="text-sm font-semibold outline-none">
          {m.offer_selected_title()}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.common_modal_close()}
          onClick={props.onClose}
        >
          <XIcon />
        </Button>
      </div>
      <SelectedBody {...props} />
    </section>
  );
}

/** Below `lg`, the same details in a sheet; closing it puts focus back on the card picked. */
export function SelectedSheet({
  open,
  returnFocus,
  onClose,
  ...props
}: Omit<Props, "leg"> & {
  leg: Leg | null;
  open: boolean;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetPopup side="bottom" finalFocus={returnFocus}>
        <SheetHeader>
          <SheetTitle className="text-base">{m.offer_selected_title()}</SheetTitle>
        </SheetHeader>
        <SheetPanel>{props.leg ? <SelectedBody {...props} leg={props.leg} /> : null}</SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
