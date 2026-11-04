import { OFFER_CANCEL_REASONS } from "@repo/api/schemas/offer";
import type { TradeTotals } from "@repo/api/schemas/staff-totals";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { sharePercent, spanText } from "./format";
import { OFFER_CANCEL_LABEL, TRADE_END_LABEL } from "./labels";
import { count, DayBars, LabelledBars, Stat } from "./parts";

function Tile({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col rounded-lg border p-3">{children}</div>;
}

export function Totals({ totals }: { totals: TradeTotals }) {
  const locale = getLocale();
  const offers = totals.offers.sum;
  const trades = totals.trades.sum;
  const time = totals.timeToComplete;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile>
          <Stat label={m.mod_trades_offers_sent()} value={count(offers.created)} />
        </Tile>
        <Tile>
          <Stat
            label={m.mod_trades_accepted()}
            value={count(offers.accepted)}
            hint={(() => {
              const percent = sharePercent(offers.accepted, offers.created, locale);
              return percent === null ? undefined : m.mod_trades_accepted_share({ percent });
            })()}
          />
        </Tile>
        <Tile>
          <Stat label={m.mod_trades_completed()} value={count(trades.completed)} />
        </Tile>
        <Tile>
          <Stat label={m.mod_trades_cancelled()} value={count(trades.cancelled)} />
        </Tile>
        <Tile>
          <Stat label={m.mod_trades_failed()} value={count(trades.failed)} />
        </Tile>
        <Tile>
          <Stat
            label={m.mod_trades_time_to_complete()}
            value={
              time.medianSeconds === null
                ? m.mod_totals_no_data()
                : spanText(time.medianSeconds, locale)
            }
            hint={
              time.p90Seconds === null
                ? undefined
                : `${m.mod_trades_time_median()} · ${m.mod_trades_time_p90({
                    time: spanText(time.p90Seconds, locale),
                    count: count(time.count),
                  })}`
            }
          />
        </Tile>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="text-sm font-semibold">{m.mod_trades_offers_chart()}</h2>
          <DayBars
            title={m.mod_trades_offers_sent()}
            days={totals.offers.days.map((d) => ({ day: d.day, count: d.counts.created }))}
          />
        </section>
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="text-sm font-semibold">{m.mod_trades_trades_chart()}</h2>
          <DayBars
            title={m.mod_trades_completed()}
            tone="success"
            days={totals.trades.days.map((d) => ({ day: d.day, count: d.counts.completed }))}
            more={[
              {
                label: m.mod_trades_chart_cancelled(),
                counts: totals.trades.days.map((d) => d.counts.cancelled),
              },
              {
                label: m.mod_trades_chart_failed(),
                counts: totals.trades.days.map((d) => d.counts.failed),
              },
            ]}
          />
        </section>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <LabelledBars
          title={m.mod_trades_offer_endings()}
          rows={[
            { key: "declined", label: m.mod_trades_offer_declined(), count: offers.declined },
            { key: "withdrawn", label: m.mod_trades_offer_withdrawn(), count: offers.withdrawn },
            { key: "countered", label: m.mod_trades_offer_countered(), count: offers.countered },
            { key: "expired", label: m.mod_trades_offer_expired(), count: offers.expired },
            { key: "cancelled", label: m.mod_trades_offer_cancelled(), count: offers.cancelled },
          ]}
        />
        <LabelledBars
          title={m.mod_trades_offer_cancels()}
          rows={OFFER_CANCEL_REASONS.map((reason) => ({
            key: reason,
            label: OFFER_CANCEL_LABEL[reason](),
            count: offers[`cancelled_${reason}`],
          }))}
        />
        <LabelledBars
          title={m.mod_trades_trade_endings()}
          tone="destructive"
          rows={(Object.keys(TRADE_END_LABEL) as (keyof typeof TRADE_END_LABEL)[]).map((key) => ({
            key,
            label: TRADE_END_LABEL[key](),
            count: trades[key],
          }))}
        />
      </div>
    </>
  );
}

export function TotalsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-18 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </>
  );
}
