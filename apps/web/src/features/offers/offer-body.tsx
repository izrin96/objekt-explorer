import {
  ArrowsLeftRightIcon,
  CaretRightIcon,
  CheckCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { OfferView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CautionLine } from "@/features/moderation/caution-line";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { formatCount } from "@/lib/number";
import { joinList } from "@/lib/text";
import { m } from "@/paraglide/messages";
import { useNoticesStore } from "@/stores/notices";
import { cancelOfferHold, holdOfferAction, useOfferHolds } from "@/stores/offer-holds";

import { useOfferActions } from "./actions";
import { declineNudge } from "./decline-nudge";
import {
  cancelReasonText,
  expiresLabel,
  itemLabel,
  offerNo,
  offerStatusText,
  tradeNo,
  tradeStatusText,
} from "./format";
import { type HeldAction, holdLine } from "./hold";
import { isLopsided } from "./lopsided";
import { Mono, Progress, TopupText } from "./mono";
import { OfferSideList } from "./offer-side-list";
import { nudgeOnePostRule } from "./one-post-rule";
import { type Collections, pickKey } from "./pick";
import { allSent } from "./sent";
import { nudgeWantedRule } from "./wanted-rule";

export function OfferBody({
  offer,
  name,
  collections,
  onCounter,
  onOpen,
}: {
  offer: OfferView;
  name: string;
  collections: Collections;
  /** absent, no Counter: the partner has no Cosmo profile to address */
  onCounter?: (offer: OfferView) => void;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const now = useMinuteClock();
  const actions = useOfferActions(offer.conversationId, (keys) =>
    joinList(
      [...offer.give, ...offer.get]
        .filter((item) => keys.has(pickKey(item)))
        .map((item) => itemLabel(item, collections)),
    ),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const held = useOfferHolds((s) => s.holds[offer.id]);
  const undoRef = useRef<HTMLButtonElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);
  const withdrawRef = useRef<HTMLButtonElement>(null);
  const acceptRef = useRef<HTMLButtonElement>(null);
  const hold = (action: HeldAction) => {
    const origin = action === "decline" ? declineRef : withdrawRef;
    const input = { offerId: offer.id };
    flushSync(() =>
      holdOfferAction(offer.id, action, {
        send: () => (action === "decline" ? decline(input) : actions.withdraw.mutate(input)),
        // after the restored button has rendered; with the thread gone the ref is null and this does nothing
        onUndo: () => requestAnimationFrame(() => origin.current?.focus()),
      }),
    );
    undoRef.current?.focus();
  };
  // a promise, not the mutation's per-call onSuccess, so the nudge survives the thread unmounting
  const decline = (input: { offerId: number }) =>
    void actions.decline
      .mutateAsync(input)
      .then(() => {
        const nudge = declineNudge(offer, useNoticesStore.getState().dismissed);
        if (nudge === "wanted") nudgeWantedRule(queryClient);
        else if (nudge === "one-post") nudgeOnePostRule(queryClient);
      })
      .catch(() => {});
  const busy = actions.accept.isPending || actions.decline.isPending || actions.withdraw.isPending;
  const canCounter = offer.actions.includes("counter") && onCounter;
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
          <Mono className="text-muted-foreground text-xs">{offerNo(offer.id)}</Mono>
          {offer.post ? (
            <span className="text-muted-foreground text-xs break-words">
              {m.offer_on_post({ post: offer.post.name })}
            </span>
          ) : offer.askPosts ? (
            <span className="text-muted-foreground text-xs break-words">
              {m.offer_asks_from_posts({
                count: formatCount(offer.askPosts.length),
                posts: joinList(offer.askPosts.map((post) => post.name)),
              })}
            </span>
          ) : null}
        </p>
        <Badge variant={open && !offer.mine ? "secondary" : "outline"} className="shrink-0">
          {offerStatusText(offer)}
        </Badge>
      </header>

      <div className="grid gap-3 @md:grid-cols-[1fr_auto_1fr]">
        <OfferSideList
          label={m.offer_side_give()}
          items={offer.give}
          collections={collections}
          open={open}
          onOpen={onOpen}
        />
        <ArrowsLeftRightIcon
          aria-hidden
          className="text-muted-foreground mt-6 hidden size-4 @md:block"
        />
        <OfferSideList
          label={m.offer_side_get()}
          items={offer.get}
          collections={collections}
          open={open}
          onOpen={onOpen}
        />
      </div>

      {offer.topup ? (
        <p className="text-warning-foreground flex items-start gap-1.5 text-xs text-pretty">
          <WarningIcon aria-hidden weight="fill" className="mt-px size-3.5 shrink-0" />
          <TopupText topup={offer.topup} />
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

      {open && allSent(offer) ? (
        <p className="text-success-foreground flex items-start gap-1.5 text-xs text-pretty">
          <CheckCircleIcon aria-hidden weight="fill" className="mt-px size-3.5 shrink-0" />
          {offer.mine ? m.offer_sent_hint_wait({ name }) : m.offer_sent_hint_accept()}
        </p>
      ) : null}

      {reason ? <p className="text-muted-foreground text-xs text-pretty">{reason}</p> : null}

      {offer.tradeId !== null ? (
        <Link
          to="/trade/mine/$tradeId"
          params={{ tradeId: String(offer.tradeId) }}
          className="hover:bg-secondary/60 focus-visible:ring-ring flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2"
        >
          <span>
            <Mono className="font-medium">{tradeNo(offer.tradeId)}</Mono>
            {offer.tradeStatus ? (
              <span className="text-muted-foreground"> · {tradeStatusText(offer.tradeStatus)}</span>
            ) : null}
            {offer.tradeProgress ? (
              <span className="text-muted-foreground block text-xs">
                <Progress {...offer.tradeProgress} />
              </span>
            ) : null}
          </span>
          <CaretRightIcon aria-hidden className="text-muted-foreground size-4" />
        </Link>
      ) : null}

      {(open && hydrated) || offer.actions.length > 0 ? (
        <footer className="flex flex-wrap items-center justify-between gap-2">
          {open && hydrated ? (
            <p className="text-muted-foreground text-xs">{expiresLabel(offer.expiresAt, now)}</p>
          ) : null}
          {held ? (
            <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
              <p className="text-muted-foreground text-sm">{holdLine(held)}</p>
              <Button
                ref={undoRef}
                variant="outline"
                size="sm"
                onClick={() => cancelOfferHold(offer.id)}
              >
                {m.chat_undo()}
              </Button>
            </div>
          ) : offer.actions.length > 0 ? (
            <div className="ms-auto flex flex-wrap justify-end gap-2">
              {offer.actions.includes("withdraw") ? (
                <Button
                  ref={withdrawRef}
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  loading={actions.withdraw.isPending}
                  onClick={() => hold("withdraw")}
                >
                  {m.offer_withdraw()}
                </Button>
              ) : null}
              {offer.actions.includes("decline") ? (
                <Button
                  ref={declineRef}
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  loading={actions.decline.isPending}
                  onClick={() => hold("decline")}
                >
                  {m.offer_decline()}
                </Button>
              ) : null}
              {canCounter ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onCounter(offer)}
                >
                  {m.offer_counter()}
                </Button>
              ) : null}
              {offer.actions.includes("accept") ? (
                <Button
                  ref={acceptRef}
                  size="sm"
                  disabled={busy}
                  loading={actions.accept.isPending}
                  onClick={() =>
                    isLopsided(offer)
                      ? setConfirmOpen(true)
                      : actions.accept.mutate({ offerId: offer.id })
                  }
                >
                  {m.offer_accept()}
                </Button>
              ) : null}
            </div>
          ) : null}
        </footer>
      ) : null}

      <AlertDialog
        open={confirmOpen && offer.actions.includes("accept")}
        onOpenChange={setConfirmOpen}
      >
        {/* Safari doesn't focus a clicked button, so focus would not come back to Accept by itself */}
        <AlertDialogPopup finalFocus={acceptRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.offer_lopsided_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.offer_lopsided_desc({ get: offer.get.length, give: offer.give.length })}
              {canCounter ? <span className="block">{m.offer_lopsided_counter_hint()}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {m.common_modal_cancel()}
            </AlertDialogClose>
            {canCounter ? (
              <Button
                variant="outline"
                disabled={actions.accept.isPending}
                onClick={() => {
                  setConfirmOpen(false);
                  onCounter(offer);
                }}
              >
                {m.offer_counter()}
              </Button>
            ) : null}
            <Button
              loading={actions.accept.isPending}
              onClick={() =>
                actions.accept.mutate(
                  { offerId: offer.id },
                  { onSettled: () => setConfirmOpen(false) },
                )
              }
            >
              {m.offer_accept()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
