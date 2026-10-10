import { Badge } from "@/components/ui/badge";
import { tradeNo, tradeStatusText } from "@/features/offers/format";
import { ItemLabel } from "@/features/offers/item-label";
import { m } from "@/paraglide/messages";

import { type Account, sectionTitle } from "./shared";
import { When } from "./when";

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
        {m.mod_trades_heading({ count: trades.length })}
      </h2>
      <ul className="flex flex-col gap-3">
        {trades.map((trade) => {
          const other = trade.other?.identity?.name ?? m.mod_person_gone();
          return (
            <li key={trade.id} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold tabular-nums">{tradeNo(trade.id)}</span>
                <Badge variant="outline" size="sm">
                  {tradeStatusText(trade.status)}
                </Badge>
                <span className="text-muted-foreground">{m.mod_trade_with({ name: other })}</span>
                <span className="text-muted-foreground text-xs">
                  {m.offer_trade_accepted()}{" "}
                  <When iso={trade.acceptedAt} className="font-mono tabular-nums" />
                </span>
              </div>
              <ul className="flex flex-col divide-y rounded-md border">
                {trade.legs.map((leg) => (
                  <li key={leg.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">
                        <ItemLabel item={leg} collections={collections} />
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {leg.fromTarget
                          ? m.mod_trade_direction({ from: targetName, to: other })
                          : m.mod_trade_direction({ from: other, to: targetName })}
                      </span>
                      <Badge variant="outline" size="sm">
                        {leg.state === "verified"
                          ? m.offer_leg_verified()
                          : leg.state === "waiting"
                            ? m.offer_leg_waiting()
                            : m.offer_leg_closed()}
                      </Badge>
                    </span>
                    {leg.txHash ? (
                      <span className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
                        <span className="font-mono break-all">{leg.txHash}</span>
                        {leg.verifiedAt ? (
                          <When iso={leg.verifiedAt} className="font-mono tabular-nums" />
                        ) : null}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
