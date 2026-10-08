import { ArrowRightIcon, CheckIcon, ClockIcon, XIcon } from "@phosphor-icons/react";
import type { TradeView } from "@repo/api/schemas/offer";
import { truncateAddress } from "@repo/lib/address";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { CopyButton } from "@/components/shared/copy-button";
import { m } from "@/paraglide/messages";

import { agoLabel } from "./format";
import { ItemLabel } from "./item-label";
import { OfferThumb } from "./offer-item";
import { StatusBadge } from "./status-badge";

type Leg = TradeView["legs"][number];

export function LegTable({
  trade,
  name,
  collections,
  hydrated,
  onOpen,
}: {
  trade: TradeView;
  name: string;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  hydrated: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="max-sm:sr-only">
        <tr className="text-muted-foreground border-b text-xs">
          <th scope="col" className="py-2 pe-3 text-start font-medium">
            {m.offer_leg_col_objekt()}
          </th>
          <th scope="col" className="py-2 pe-3 text-start font-medium">
            {m.offer_leg_col_direction()}
          </th>
          <th scope="col" className="py-2 text-end font-medium">
            {m.offer_leg_col_status()}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {trade.legs.map((leg) => (
          <tr
            key={leg.id}
            className="max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:gap-x-3 max-sm:gap-y-1 max-sm:py-3"
          >
            <td className="py-3 pe-3 max-sm:p-0">
              <span className="flex items-center gap-3">
                <OfferThumb
                  slug={leg.collectionSlug}
                  collection={collections[leg.collectionSlug]}
                  onOpen={onOpen}
                  className="w-10"
                />
                <span className="min-w-0 font-medium break-words">
                  <ItemLabel item={leg} collections={collections} />
                </span>
              </span>
            </td>
            {/* under both below `sm`, so a long name and the Waiting chip don't squeeze it */}
            <td className="py-3 pe-3 max-sm:col-span-2 max-sm:p-0 max-sm:ps-13">
              <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
                <span>{leg.fromYou ? m.offer_you() : name}</span>
                <ArrowRightIcon aria-hidden className="size-3 shrink-0" />
                <span className="sr-only">{m.offer_trade_to()}</span>
                <span>{leg.fromYou ? name : m.offer_you()}</span>
              </span>
            </td>
            <td className="py-3 text-end max-sm:col-start-2 max-sm:row-start-1 max-sm:max-w-40 max-sm:p-0">
              <LegState leg={leg} lastCheckedAt={trade.lastCheckedAt} hydrated={hydrated} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LegState({
  leg,
  lastCheckedAt,
  hydrated,
}: {
  leg: Leg;
  lastCheckedAt: string | null;
  hydrated: boolean;
}) {
  if (leg.state === "verified") {
    return (
      <span className="inline-flex flex-col items-end gap-0.5 text-xs">
        <StatusBadge tone="success">
          <CheckIcon weight="bold" aria-hidden />
          {m.offer_leg_verified()}
        </StatusBadge>
        {leg.txHash ? (
          <span className="text-muted-foreground flex flex-wrap items-center justify-end gap-x-1">
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
          </span>
        ) : null}
      </span>
    );
  }
  if (leg.state === "waiting") {
    return (
      <span className="inline-flex flex-col items-end gap-0.5 text-xs">
        <StatusBadge tone="warning">
          <ClockIcon weight="bold" aria-hidden />
          {m.offer_leg_waiting()}
        </StatusBadge>
        {lastCheckedAt && hydrated ? (
          <time dateTime={lastCheckedAt} className="text-muted-foreground">
            {m.offer_leg_checked({ time: agoLabel(lastCheckedAt) })}
          </time>
        ) : null}
      </span>
    );
  }
  return (
    <StatusBadge tone="destructive">
      <XIcon weight="bold" aria-hidden />
      {m.offer_leg_closed()}
    </StatusBadge>
  );
}
