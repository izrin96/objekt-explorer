import type { TradeView as Trade } from "@repo/api/schemas/offer";

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
