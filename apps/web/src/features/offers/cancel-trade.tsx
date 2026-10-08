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
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { useOfferActions } from "./actions";
import { itemLabel, tradeNo } from "./format";
import { type Collections, pickKey } from "./pick";

export function CancelTrade({ trade, collections }: { trade: Trade; collections: Collections }) {
  const [open, setOpen] = useState(false);
  const actions = useOfferActions(trade.conversationId, (keys) =>
    trade.legs
      .filter((leg) => keys.has(pickKey(leg)))
      .map((leg) => itemLabel(leg, collections))
      .join(", "),
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {m.offer_trade_cancel()}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
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
                  { onSettled: () => setOpen(false) },
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
