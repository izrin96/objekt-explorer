import type { TradeView as Trade } from "@repo/api/schemas/offer";
import { truncateAddress } from "@repo/lib/address";

import { CopyButton } from "@/components/shared/copy-button";
import { TONE_SOLID } from "@/lib/tone";
import { m } from "@/paraglide/messages";

import { itemLabel, shortDate, tradeStatusText } from "./format";
import type { Collections } from "./pick";
import { statusTone } from "./status-badge";
import { historyRows } from "./trade-clock";
import { Dot } from "./trade-clock-panel";
import { InPlaceOf } from "./wrong-copy";

/** An ended trade's proposed, accepted, transfers and end. */
export function TradeHistoryPanel({
  trade,
  collections,
  name,
  hydrated,
}: {
  trade: Trade;
  collections: Collections;
  name: string;
  hydrated: boolean;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4 text-sm">
      <h3 className="font-medium">{m.offer_history_title()}</h3>
      <ol className="flex flex-col gap-2.5">
        {historyRows(trade).map((row, index) => (
          <li key={`${row.kind}-${index}`} className="flex items-start gap-2.5">
            <Dot
              className={
                row.kind === "end" ? TONE_SOLID[statusTone(trade.status)] : "bg-muted-foreground"
              }
            />
            <span className="flex min-w-0 flex-1 flex-col text-pretty wrap-anywhere">
              <span>
                {row.kind === "proposed"
                  ? m.offer_trade_proposed()
                  : row.kind === "accepted"
                    ? m.offer_trade_accepted()
                    : row.kind === "end"
                      ? tradeStatusText(trade.status)
                      : row.leg.fromYou
                        ? m.offer_clock_you_sent({ objekt: itemLabel(row.leg, collections) })
                        : m.offer_clock_they_sent({
                            name,
                            objekt: itemLabel(row.leg, collections),
                          })}
              </span>
              {row.kind === "transfer" ? (
                <span className="text-muted-foreground flex flex-wrap items-center gap-x-1 text-xs">
                  {row.leg.txHash ? (
                    <>
                      <span className="font-mono" title={row.leg.txHash}>
                        {truncateAddress(row.leg.txHash)}
                      </span>
                      <CopyButton
                        text={row.leg.txHash}
                        label={m.offer_copy_hash()}
                        toastTitle={m.offer_hash_copied()}
                      />
                    </>
                  ) : null}
                  <InPlaceOf leg={row.leg} />
                </span>
              ) : null}
            </span>
            {row.at && hydrated ? (
              <time
                dateTime={row.at}
                className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums"
              >
                {shortDate(row.at)}
              </time>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
