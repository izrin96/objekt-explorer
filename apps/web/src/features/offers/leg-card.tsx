import {
  CheckIcon,
  ClockIcon,
  type Icon,
  MinusIcon,
  PaperPlaneTiltIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { untilLabel } from "@/features/chat/format";
import { getCollectionShortNo } from "@/features/objekt/objekt-utils";
import type { Tone } from "@/lib/tone";
import { m } from "@/paraglide/messages";

import { type Leg, type LegChip as Chip, legChip } from "./next-step";
import { OfferThumb } from "./offer-item";
import { StatusBadge } from "./status-badge";
import { InPlaceOf, Serial, rich } from "./wrong-copy";

const CHIPS: Record<Chip, { tone: Tone; icon: Icon; label: () => string }> = {
  verified: { tone: "success", icon: CheckIcon, label: m.offer_leg_verified },
  waiting: { tone: "warning", icon: ClockIcon, label: m.offer_leg_waiting_short },
  sendThis: { tone: "progress", icon: PaperPlaneTiltIcon, label: m.offer_leg_send_this },
  differentCopy: { tone: "warning", icon: WarningIcon, label: m.offer_side_different },
  notSent: { tone: "neutral", icon: MinusIcon, label: m.offer_side_not_sent },
};

/** A plain card for one objekt of the trade; the class swatch is the only class colour on it. */
export function LegCard({
  leg,
  collection,
  ended,
  onOpen,
}: {
  leg: Leg;
  collection: ValidObjekt | undefined;
  ended: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const chip = CHIPS[legChip(leg, ended)];
  return (
    <li className="flex min-w-0 gap-3.5">
      <OfferThumb
        slug={leg.collectionSlug}
        collection={collection}
        onOpen={onOpen}
        className="w-28 max-sm:w-21"
      />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="max-w-full truncate font-medium">
          {collection?.member ?? leg.collectionSlug}
        </p>
        <p className="flex max-w-full items-baseline gap-2 font-mono text-xs">
          <span className="truncate">
            {collection ? getCollectionShortNo(collection) : leg.collectionSlug}
          </span>
          <span className="text-muted-foreground shrink-0">
            {leg.objektId === null ? (
              m.offer_leg_any_copy()
            ) : (
              <Serial serial={leg.serial} estimated={leg.serialEstimated} />
            )}
          </span>
        </p>
        {collection ? (
          <p className="text-muted-foreground flex max-w-full items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full border"
              style={{ backgroundColor: collection.backgroundColor }}
            />
            <span className="truncate">{collection.class}</span>
          </p>
        ) : null}
        <StatusBadge tone={chip.tone} className="mt-1">
          <chip.icon weight="bold" aria-hidden />
          {chip.label()}
        </StatusBadge>
        {leg.state === "waiting"
          ? leg.substitutes.map((sub) => (
              <p
                key={sub.id}
                className={
                  sub.status === "pending"
                    ? "text-warning-foreground text-xs"
                    : "text-muted-foreground text-xs"
                }
              >
                {rich(m.offer_leg_copy_sent, {
                  sent: <Serial serial={sub.serial} estimated={sub.serialEstimated} />,
                })}
                {sub.status === "declined" ? <> · {m.offer_wrong_copy_declined()}</> : null}
              </p>
            ))
          : null}
        <InPlaceOf leg={leg} />
        {leg.state === "waiting" && leg.stuck ? (
          <p className="text-warning-foreground flex items-start gap-1 text-xs text-pretty">
            <WarningIcon aria-hidden weight="fill" className="mt-px size-3.5 shrink-0" />
            {m.offer_leg_stuck()}
          </p>
        ) : null}
        {leg.state === "waiting" && leg.away ? (
          <p className="text-warning-foreground flex items-start gap-1 text-xs text-pretty">
            <WarningIcon aria-hidden weight="fill" className="mt-px size-3.5 shrink-0" />
            {m.offer_leg_away({ date: untilLabel(leg.away.breaksAt) })}
          </p>
        ) : null}
      </div>
    </li>
  );
}
