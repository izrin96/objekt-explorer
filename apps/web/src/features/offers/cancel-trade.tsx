import type { TradeView as Trade } from "@repo/api/schemas/offer";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { joinList } from "@/lib/text";
import { m } from "@/paraglide/messages";

import { useOfferActions } from "./actions";
import { itemLabel, tradeNo } from "./format";
import { type Collections, pickKey } from "./pick";

/** The confirmation only: the menu and the banner each open it. */
export function CancelTrade({
  trade,
  collections,
  open,
  onOpenChange,
}: {
  trade: Trade;
  collections: Collections;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const actions = useOfferActions(trade.conversationId, (keys) =>
    joinList(
      trade.legs.filter((leg) => keys.has(pickKey(leg))).map((leg) => itemLabel(leg, collections)),
    ),
  );

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.offer_trade_cancel_title({ trade: tradeNo(trade.id) })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.offer_trade_cancel_desc({ name: trade.partner.identity.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {m.offer_trade_keep()}
            </AlertDialogClose>
            <Button
              variant="destructive"
              loading={actions.cancelTrade.isPending}
              onClick={() =>
                actions.cancelTrade.mutate(
                  { tradeId: trade.id },
                  { onSettled: () => onOpenChange(false) },
                )
              }
            >
              {m.offer_trade_cancel()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

/** Ask to cancel's confirmation, which the menu opens while Cancel trade is locked. */
export function AskCancel({
  trade,
  open,
  onOpenChange,
}: {
  trade: Trade;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const actions = useOfferActions(trade.conversationId, () => "");
  const name = trade.partner.identity.name;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.offer_cancel_ask_title({ name, trade: tradeNo(trade.id) })}
          </AlertDialogTitle>
          <AlertDialogDescription>{m.offer_cancel_ask_desc()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            {m.offer_trade_keep()}
          </AlertDialogClose>
          <Button
            loading={actions.askCancel.isPending}
            onClick={() =>
              actions.askCancel.mutate(
                { tradeId: trade.id },
                { onSettled: () => onOpenChange(false) },
              )
            }
          >
            {m.offer_cancel_ask()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** Decline and Accept for the partner's request to cancel; Accept confirms first. */
export function AnswerCancelActions({
  trade,
  size = "sm",
}: {
  trade: Trade;
  size?: ButtonProps["size"];
}) {
  const actions = useOfferActions(trade.conversationId, () => "");
  const [open, setOpen] = useState(false);
  const bar = size !== "sm";
  return (
    <>
      <Button
        variant="outline"
        size={size}
        className={bar ? "shrink-0 px-3 text-base" : undefined}
        loading={actions.answerCancel.isPending && actions.answerCancel.variables?.accept === false}
        onClick={() => actions.answerCancel.mutate({ tradeId: trade.id, accept: false })}
      >
        {m.offer_cancel_decline()}
      </Button>
      <Button
        size={size}
        className={bar ? "min-w-0 flex-1 px-3 text-base" : undefined}
        onClick={() => setOpen(true)}
      >
        {m.offer_cancel_accept()}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.offer_cancel_accept_title({ trade: tradeNo(trade.id) })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.offer_cancel_accept_desc({ name: trade.partner.identity.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {m.offer_trade_keep()}
            </AlertDialogClose>
            <Button
              variant="destructive"
              loading={actions.answerCancel.isPending}
              onClick={() =>
                actions.answerCancel.mutate(
                  { tradeId: trade.id, accept: true },
                  { onSettled: () => setOpen(false) },
                )
              }
            >
              {m.offer_cancel_accept_confirm()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

/** The asker takes their waiting request back; nobody is notified, so it needs no confirmation. */
export function WithdrawCancel({ trade }: { trade: Trade }) {
  const actions = useOfferActions(trade.conversationId, () => "");
  return (
    <Button
      variant="outline"
      size="sm"
      loading={actions.withdrawCancel.isPending}
      onClick={() => actions.withdrawCancel.mutate({ tradeId: trade.id })}
    >
      {m.offer_cancel_withdraw()}
    </Button>
  );
}
