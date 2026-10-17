import { CheckIcon, ClockIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import type { TradeView } from "@repo/api/schemas/offer";
import { truncateAddress } from "@repo/lib/address";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { CopyButton } from "@/components/shared/copy-button";
import { getCollectionShortNo } from "@/features/objekt/objekt-utils";
import { m } from "@/paraglide/messages";

import { agoLabel } from "./format";
import { OfferThumb } from "./offer-item";
import { StatusBadge } from "./status-badge";
import { HeldCopies, InPlaceOf, Serial } from "./wrong-copy";

type Leg = TradeView["legs"][number];

/** A plain card for one objekt of the trade; the class swatch is the only class colour on it. */
export function LegCard({
  leg,
  collection,
  hydrated,
  onOpen,
}: {
  leg: Leg;
  collection: ValidObjekt | undefined;
  hydrated: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    <li className="bg-card flex gap-3 rounded-xl border p-3">
      <OfferThumb
        slug={leg.collectionSlug}
        collection={collection}
        onOpen={onOpen}
        className="w-28 max-sm:w-21"
      />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <div className="flex max-w-full min-w-0 flex-col gap-0.5">
          <p className="truncate font-medium">{collection?.member ?? leg.collectionSlug}</p>
          <p className="flex items-baseline gap-2 text-xs">
            <span className="font-mono">
              {collection ? getCollectionShortNo(collection) : leg.collectionSlug}
            </span>
            <span className="text-muted-foreground">
              {leg.objektId === null ? (
                m.offer_leg_any_copy()
              ) : (
                <Serial serial={leg.serial} estimated={leg.serialEstimated} />
              )}
            </span>
          </p>
          {collection ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full border"
                style={{ backgroundColor: collection.backgroundColor }}
              />
              <span className="truncate">{collection.class}</span>
            </p>
          ) : null}
        </div>
        <LegChip leg={leg} />
        {leg.state === "verified" && leg.txHash ? (
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-1 text-xs">
            <span className="font-mono" title={leg.txHash}>
              {truncateAddress(leg.txHash)}
            </span>
            <CopyButton
              text={leg.txHash}
              label={m.offer_copy_hash()}
              toastTitle={m.offer_hash_copied()}
            />
            {/* relative to the viewer's clock, so it waits for the client */}
            {leg.verifiedAt && hydrated ? (
              <time dateTime={leg.verifiedAt}>{agoLabel(leg.verifiedAt)}</time>
            ) : null}
          </p>
        ) : null}
        <InPlaceOf leg={leg} />
        {leg.state === "waiting" && leg.stuck ? (
          <p className="text-warning-foreground flex items-start gap-1 text-xs text-pretty">
            <WarningIcon aria-hidden weight="fill" className="mt-px size-3.5 shrink-0" />
            {m.offer_leg_stuck()}
          </p>
        ) : null}
        <HeldCopies leg={leg} hydrated={hydrated} />
      </div>
    </li>
  );
}

function LegChip({ leg }: { leg: Leg }) {
  if (leg.state === "verified") {
    return (
      <StatusBadge tone="success">
        <CheckIcon weight="bold" aria-hidden />
        {m.offer_leg_verified()}
      </StatusBadge>
    );
  }
  if (leg.state === "waiting") {
    return (
      <StatusBadge tone="warning">
        <ClockIcon weight="bold" aria-hidden />
        {m.offer_leg_waiting_short()}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone="destructive">
      <XIcon weight="bold" aria-hidden />
      {m.offer_leg_closed()}
    </StatusBadge>
  );
}
