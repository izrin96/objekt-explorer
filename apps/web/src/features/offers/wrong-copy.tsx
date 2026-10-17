import type { TradeView } from "@repo/api/schemas/offer";
import { truncateAddress } from "@repo/lib/address";
import { Fragment, type ReactNode, useState } from "react";

import { CopyButton } from "@/components/shared/copy-button";
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
import { SerialNo } from "@/features/objekt/objekt-label";
import { m } from "@/paraglide/messages";

import type { useOfferActions } from "./actions";
import { agoLabel } from "./format";
import { StatusBadge } from "./status-badge";

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

/** "#1207 in place of #1203", under a leg verified with a wrong copy, by Accept or automatically. */
export function InPlaceOf({ leg }: { leg: Leg }) {
  if (leg.state !== "verified" || leg.objektId === null || leg.verifiedObjektId === leg.objektId) {
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

/** One line per copy held on a leg's card; deciding on it is the banner's job. */
export function HeldCopies({ leg, hydrated }: { leg: Leg; hydrated: boolean }) {
  if (leg.substitutes.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {leg.substitutes.map((sub) => (
        <li key={sub.id} className="text-muted-foreground flex flex-col gap-0.5 text-xs">
          <span className="text-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {rich(m.offer_leg_copy_sent, {
                sent: <Serial serial={sub.serial} estimated={sub.serialEstimated} />,
              })}
            </span>
            {sub.status === "declined" ? (
              <StatusBadge tone="neutral">{m.offer_wrong_copy_declined()}</StatusBadge>
            ) : null}
          </span>
          <span className="flex flex-wrap items-center gap-x-1">
            <span className="font-mono" title={sub.txHash}>
              {truncateAddress(sub.txHash)}
            </span>
            <CopyButton
              text={sub.txHash}
              label={m.offer_copy_hash()}
              toastTitle={m.offer_hash_copied()}
            />
            {/* relative to the viewer's clock, so it waits for the client */}
            {hydrated ? <time dateTime={sub.at}>{agoLabel(sub.at)}</time> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Accept and its confirmation, for the copy the banner shows. */
export function AcceptCopy({
  sub,
  leg,
  actions,
}: {
  sub: Substitute;
  leg: Leg;
  actions: ReturnType<typeof useOfferActions>;
}) {
  const [open, setOpen] = useState(false);
  const sent = <Serial serial={sub.serial} estimated={sub.serialEstimated} />;
  const asked = <Serial serial={leg.serial} estimated={leg.serialEstimated} />;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {rich(m.offer_wrong_copy_accept, { sent })}
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
