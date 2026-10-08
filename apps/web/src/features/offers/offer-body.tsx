import { CaretRightIcon, WarningIcon } from "@phosphor-icons/react";
import type { OfferView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CautionLine } from "@/features/chat/caution-line";
import { m } from "@/paraglide/messages";

import { useOfferActions } from "./actions";
import {
  cancelReasonText,
  expiresLabel,
  itemLabel,
  offerNo,
  offerStatusText,
  topupText,
  tradeNo,
  tradeStatusText,
} from "./format";
import { OfferSideList } from "./offer-side-list";
import { type Collections, pickKey } from "./pick";

export function OfferBody({
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
      .filter((item) => keys.has(pickKey(item)))
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
