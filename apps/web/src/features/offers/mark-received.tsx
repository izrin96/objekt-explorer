import { Link } from "@tanstack/react-router";
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
import { untilLabel } from "@/features/chat/format";
import { m } from "@/paraglide/messages";

import { useOfferActions } from "./actions";
import { type Leg, canMarkReceived } from "./next-step";

/** Only where `canMarkReceived`: closes the leg for good, so it asks first. */
export function MarkReceived({
  conversationId,
  leg,
  objekt,
}: {
  conversationId: number;
  leg: Leg;
  /** the objekt as the dialog names it */
  objekt: string;
}) {
  const actions = useOfferActions(conversationId, () => "");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {m.offer_mark_received()}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.offer_mark_received_title({ objekt })}</AlertDialogTitle>
            <AlertDialogDescription>{m.offer_mark_received_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {m.common_modal_cancel()}
            </AlertDialogClose>
            <Button
              loading={actions.confirmLeg.isPending}
              onClick={() =>
                actions.confirmLeg.mutate({ legId: leg.id }, { onSettled: () => setOpen(false) })
              }
            >
              {m.offer_mark_received()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

/** Under the receiver's away note: a profile linked in time counts, or the leg can be closed by hand. */
export function AwayHint({
  conversationId,
  leg,
  objekt,
}: {
  conversationId: number;
  leg: Leg;
  objekt: string;
}) {
  if (!leg.away) return null;
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-muted-foreground text-xs text-pretty">
        {m.offer_away_hint({ date: untilLabel(leg.away.breaksAt) })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" render={<Link to="/account/profiles" />}>
          {m.offer_away_hint_link()}
        </Button>
        {canMarkReceived(leg, false) ? (
          <MarkReceived conversationId={conversationId} leg={leg} objekt={objekt} />
        ) : null}
      </div>
    </div>
  );
}
