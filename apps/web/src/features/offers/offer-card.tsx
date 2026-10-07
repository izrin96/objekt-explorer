import { CaretRightIcon, WarningIcon } from "@phosphor-icons/react";
import type { OfferItemView, OfferView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CautionLine } from "@/features/chat/caution-line";
import { m } from "@/paraglide/messages";

import { useOfferActions } from "./actions";
import {
  cancelReasonText,
  expiresLabel,
  itemLabel,
  offerNo,
  offerStatusText,
  offerSummary,
  topupText,
  tradeNo,
  tradeStatusText,
} from "./format";
import type { OfferRequest } from "./offer-builder";
import { OfferThumb } from "./offer-item";

type Collections = Readonly<Record<string, ValidObjekt | undefined>>;

/** The counter starts from this offer as the viewer sees it; the note is theirs, so it stays. */
export function counterRequest(
  offer: OfferView,
  name: string,
  collections: Collections,
): OfferRequest {
  const pick = (item: OfferItemView, kept = false) => ({
    key: item.objektId ?? `any:${item.collectionSlug}`,
    collectionSlug: item.collectionSlug,
    objektId: item.objektId,
    serial: item.serial,
    listSlug: item.listSlug,
    flags: null,
    kept,
  });
  return {
    to: { conversationId: offer.conversationId },
    name,
    counter: true,
    prefill: {
      // an any-copy ask stays, and the builder finds one of the viewer's copies for it
      give: offer.give.map((item) => pick(item)),
      get: offer.get.map((item) => pick(item, true)),
      topup: offer.topup
        ? {
            amount: Number(offer.topup.amount),
            currency: offer.topup.currency,
            payer: offer.topup.payer === "you" ? "from" : "to",
          }
        : undefined,
      collections,
    },
  };
}

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
      <div className="bg-background w-80 max-w-full rounded-lg border">
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
    <Collapsible className="bg-background w-80 max-w-full rounded-lg border">
      <CollapsibleTrigger className="group focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm outline-none focus-visible:ring-2">
        <CaretRightIcon
          aria-hidden
          className="text-muted-foreground size-3.5 shrink-0 transition-transform group-data-panel-open:rotate-90"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline gap-2">
            <span className="text-xs font-medium tabular-nums">{offerNo(offer.id)}</span>
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

function OfferBody({
  offer,
  name,
  collections,
  hydrated,
  onCounter,
  onOpen,
}: {
  offer: OfferView;
  name: string;
  collections: Collections;
  hydrated: boolean;
  onCounter: (offer: OfferView) => void;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const actions = useOfferActions(offer.conversationId, (keys) =>
    [...offer.give, ...offer.get]
      .filter((item) => keys.has(item.objektId ?? `any:${item.collectionSlug}`))
      .map((item) => itemLabel(item, collections))
      .join(", "),
  );
  const busy = actions.accept.isPending || actions.decline.isPending || actions.withdraw.isPending;
  const open = offer.status === "open";
  const reason = offer.status === "cancelled" ? cancelReasonText(offer.cancelReason) : null;
  const title = offer.mine
    ? offer.parentId
      ? m.offer_card_your_counter()
      : m.offer_card_yours()
    : offer.parentId
      ? m.offer_card_counter_from({ name })
      : m.offer_card_from({ name });

  return (
    <div className="flex flex-col gap-3 p-3">
      <header className="flex items-start justify-between gap-2">
        <p className="flex min-w-0 flex-col">
          <span className="text-sm font-medium break-words">{title}</span>
          <span className="text-muted-foreground text-xs tabular-nums">{offerNo(offer.id)}</span>
        </p>
        <Badge variant={open && !offer.mine ? "secondary" : "outline"} className="shrink-0">
          {offerStatusText(offer)}
        </Badge>
      </header>

      <OfferSideList
        label={m.offer_side_give()}
        items={offer.give}
        collections={collections}
        onOpen={onOpen}
      />
      <OfferSideList
        label={m.offer_side_get()}
        items={offer.get}
        collections={collections}
        onOpen={onOpen}
      />

      {offer.topup ? (
        <p className="text-warning-foreground flex items-start gap-1.5 text-xs text-pretty">
          <WarningIcon aria-hidden weight="fill" className="mt-px size-3.5 shrink-0" />
          {topupText(offer.topup)}
        </p>
      ) : null}

      {offer.note ? (
        <div className="flex flex-col gap-1">
          <p className="bg-secondary rounded-md px-2.5 py-1.5 text-sm wrap-anywhere whitespace-pre-wrap">
            {offer.note}
          </p>
          {offer.caution && offer.caution.length > 0 ? (
            <CautionLine categories={offer.caution} />
          ) : null}
        </div>
      ) : null}

      {reason ? <p className="text-muted-foreground text-xs text-pretty">{reason}</p> : null}

      {offer.tradeId !== null ? (
        <Link
          to="/trade/mine/$tradeId"
          params={{ tradeId: String(offer.tradeId) }}
          className="hover:bg-secondary/60 focus-visible:ring-ring flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2"
        >
          <span>
            <span className="font-medium tabular-nums">{tradeNo(offer.tradeId)}</span>
            {offer.tradeStatus ? (
              <span className="text-muted-foreground"> · {tradeStatusText(offer.tradeStatus)}</span>
            ) : null}
            {offer.tradeProgress ? (
              <span className="text-muted-foreground block text-xs">
                {m.offer_progress(offer.tradeProgress)}
              </span>
            ) : null}
          </span>
          <CaretRightIcon aria-hidden className="text-muted-foreground size-4" />
        </Link>
      ) : null}

      {open && hydrated ? (
        <p className="text-muted-foreground text-xs">{expiresLabel(offer.expiresAt)}</p>
      ) : null}

      {offer.actions.length > 0 ? (
        <div className="flex flex-wrap justify-end gap-2">
          {offer.actions.includes("withdraw") ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              loading={actions.withdraw.isPending}
              onClick={() => actions.withdraw.mutate({ offerId: offer.id })}
            >
              {m.offer_withdraw()}
            </Button>
          ) : null}
          {offer.actions.includes("decline") ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              loading={actions.decline.isPending}
              onClick={() => actions.decline.mutate({ offerId: offer.id })}
            >
              {m.offer_decline()}
            </Button>
          ) : null}
          {offer.actions.includes("counter") ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onCounter(offer)}>
              {m.offer_counter()}
            </Button>
          ) : null}
          {offer.actions.includes("accept") ? (
            <Button
              size="sm"
              disabled={busy}
              loading={actions.accept.isPending}
              onClick={() => actions.accept.mutate({ offerId: offer.id })}
            >
              {m.offer_accept()}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function OfferSideList({
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
          {items.map((item) => (
            <li
              key={item.objektId ?? `any:${item.collectionSlug}`}
              className="flex min-w-0 items-center gap-2.5"
            >
              <OfferThumb
                slug={item.collectionSlug}
                collection={collections[item.collectionSlug]}
                onOpen={onOpen}
                className="w-9"
              />
              <span className="min-w-0 text-sm break-words">{itemLabel(item, collections)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
