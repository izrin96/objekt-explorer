import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { serialText, tradeNo, tradeStatusText } from "@/features/offers/format";
import { ItemLabel } from "@/features/offers/item-label";
import type { Collections } from "@/features/offers/pick";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

import { type Account, sectionTitle } from "./shared";
import { When } from "./when";

/** What every staff leg view reads: the console's account-relative legs and the staff trade's. */
export type StaffLeg = {
  id: number;
  collectionSlug: string;
  objektId: string | null;
  serial: number | null;
  serialEstimated: boolean;
  state: "verified" | "waiting" | "closed";
  verifiedAt: string | null;
  txHash: string | null;
  verifiedSerial: number | null;
  verifiedSerialEstimated: boolean;
  autoAccepted: boolean;
};

export function LegStateBadge({ state }: { state: StaffLeg["state"] }) {
  return (
    <Badge variant="outline" size="sm">
      {state === "verified"
        ? m.offer_leg_verified()
        : state === "waiting"
          ? m.offer_leg_waiting()
          : m.offer_leg_closed()}
    </Badge>
  );
}

/** A leg verified through a wrong copy: what was sent for what was asked. */
export function LegCopyLine({ leg }: { leg: StaffLeg }) {
  if (leg.state !== "verified" || leg.verifiedSerial === null) return null;
  return (
    <span className="text-muted-foreground text-xs">
      {m.offer_leg_in_place_of({
        sent: serialText({ serial: leg.verifiedSerial, estimated: leg.verifiedSerialEstimated }),
        asked: serialText({ serial: leg.serial, estimated: leg.serialEstimated }),
      })}
      {leg.autoAccepted ? <> · {m.offer_leg_auto_accepted()}</> : null}
    </span>
  );
}

/** Legs with giver and receiver by name, state, hash and time; no message text. */
function TradeLegs<L extends StaffLeg>({
  legs,
  collections,
  names,
}: {
  legs: L[];
  collections: Collections;
  names: (leg: L) => { from: string; to: string };
}) {
  return (
    <ul className="flex flex-col divide-y rounded-md border">
      {legs.map((leg) => (
        <li key={leg.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">
              <ItemLabel item={leg} collections={collections} />
            </span>
            <span className="text-muted-foreground text-xs">
              {m.mod_trade_direction(names(leg))}
            </span>
            <LegStateBadge state={leg.state} />
          </span>
          <LegCopyLine leg={leg} />
          {leg.txHash ? (
            <span className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="font-mono break-all">{leg.txHash}</span>
              {leg.verifiedAt ? <When iso={leg.verifiedAt} /> : null}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Trades attached to this account's open reports: legs, states and hashes, no message text. */
export function AttachedTrades({
  trades,
  collections,
  targetName,
}: {
  trades: Account["trades"];
  collections: Account["tradeCollections"];
  targetName: string;
}) {
  if (trades.length === 0) return null;
  return (
    <section aria-labelledby="mod-trades" className="flex flex-col gap-3">
      <h2 id="mod-trades" className={sectionTitle}>
        {m.mod_trades_heading({ count: formatCount(trades.length) })}
      </h2>
      <ul className="flex flex-col gap-3">
        {trades.map((trade) => {
          const other = trade.other?.identity?.name ?? m.mod_person_gone();
          return (
            <li key={trade.id} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <Link
                  to="/mod/trades/$tradeId"
                  params={{ tradeId: String(trade.id) }}
                  className="font-semibold hover:underline"
                >
                  {tradeNo(trade.id)}
                </Link>
                <Badge variant="outline" size="sm">
                  {tradeStatusText(trade.status)}
                </Badge>
                <span className="text-muted-foreground">{m.mod_trade_with({ name: other })}</span>
                <span className="text-muted-foreground text-xs">
                  {m.offer_trade_accepted()} <When iso={trade.acceptedAt} />
                </span>
              </div>
              <TradeLegs
                legs={trade.legs}
                collections={collections}
                names={(leg) =>
                  leg.fromTarget ? { from: targetName, to: other } : { from: other, to: targetName }
                }
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
