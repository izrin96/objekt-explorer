import type { TradeView } from "@repo/api/schemas/offer";
import { Fragment, type ReactNode, useState } from "react";

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
import { SerialNo } from "@/features/objekt/objekt-label";
import { m } from "@/paraglide/messages";

import { useOfferActions } from "./actions";

type Leg = TradeView["legs"][number];
type Substitute = Leg["substitutes"][number];

/** A message with markup in its slots; private-use stand-ins keep each locale's word order. */
export function rich<K extends string>(
  format: (params: Record<K, string>) => string,
  nodes: Record<K, ReactNode>,
) {
  const keys = Object.keys(nodes) as K[];
  const params = Object.fromEntries(
    keys.map((key, i) => [key, String.fromCharCode(0xe000 + i)]),
  ) as Record<K, string>;
  return format(params)
    .split(/([-])/)
    .map((part, i) => {
      const key = keys[part.length === 1 ? part.charCodeAt(0) - 0xe000 : -1];
      return <Fragment key={i}>{key === undefined ? part : nodes[key]}</Fragment>;
    });
}

export function Serial({ serial, estimated }: { serial: number | null; estimated: boolean }) {
  return serial === null ? (
    m.offer_serial_unnumbered()
  ) : (
    <SerialNo serial={serial} estimated={estimated} />
  );
}

/** A leg's serial, or "any serial" on an any-copy leg. */
export function LegSerial({ leg }: { leg: Leg }) {
  return leg.objektId === null ? (
    m.offer_leg_any_copy()
  ) : (
    <Serial serial={leg.serial} estimated={leg.serialEstimated} />
  );
}

/** "#1207 in place of #1203", under a leg verified with a wrong copy, by Accept or automatically. */
export function InPlaceOf({ leg }: { leg: Leg }) {
  if (
    leg.state !== "verified" ||
    leg.objektId === null ||
    leg.verifiedObjektId === null ||
    leg.verifiedObjektId === leg.objektId
  ) {
    return null;
  }
  return (
    <span className="text-muted-foreground block text-xs font-normal">
      {rich(m.offer_leg_in_place_of, {
        sent: <Serial serial={leg.verifiedSerial} estimated={leg.verifiedSerialEstimated} />,
        asked: <Serial serial={leg.serial} estimated={leg.serialEstimated} />,
      })}
      {leg.autoAccepted ? <> · {m.offer_leg_auto_accepted()}</> : null}
    </span>
  );
}

/** Accept and its confirmation, for the copy the banner shows. */
function AcceptCopy({
  sub,
  leg,
  actions,
  size = "sm",
  className,
}: {
  sub: Substitute;
  leg: Leg;
  actions: ReturnType<typeof useOfferActions>;
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const sent = <Serial serial={sub.serial} estimated={sub.serialEstimated} />;
  const asked = <Serial serial={leg.serial} estimated={leg.serialEstimated} />;
  return (
    <>
      <Button size={size} className={className} onClick={() => setOpen(true)}>
        <span className="truncate">{rich(m.offer_wrong_copy_accept, { sent })}</span>
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {rich(m.offer_wrong_copy_accept_title, { sent, asked })}
            </AlertDialogTitle>
            <AlertDialogDescription>{m.offer_wrong_copy_accept_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {m.common_modal_cancel()}
            </AlertDialogClose>
            <Button
              loading={actions.acceptSubstitute.isPending}
              onClick={() =>
                actions.acceptSubstitute.mutate(
                  { substituteId: sub.id },
                  { onSettled: () => setOpen(false) },
                )
              }
            >
              {rich(m.offer_wrong_copy_accept, { sent })}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

/** Decline and Accept for the copy the card shows; the phone bar renders its own pair. */
export function DecideActions({
  trade,
  leg,
  copyId,
  size = "sm",
}: {
  trade: TradeView;
  leg: Leg;
  copyId: number;
  size?: ButtonProps["size"];
}) {
  const actions = useOfferActions(trade.conversationId, () => "");
  const sub = leg.substitutes.find((copy) => copy.id === copyId)!;
  const bar = size !== "sm";
  return (
    <>
      <Button
        variant="outline"
        size={size}
        className={bar ? "shrink-0 px-3 text-base" : undefined}
        loading={actions.declineSubstitute.isPending}
        onClick={() => actions.declineSubstitute.mutate({ substituteId: sub.id })}
      >
        {m.offer_wrong_copy_decline()}
      </Button>
      <AcceptCopy
        sub={sub}
        leg={leg}
        actions={actions}
        size={size}
        className={bar ? "min-w-0 flex-1 px-3 text-base" : undefined}
      />
    </>
  );
}
