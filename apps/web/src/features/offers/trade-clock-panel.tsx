import type { TradeView as Trade } from "@repo/api/schemas/offer";
import type { ReactNode } from "react";

import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { itemLabel, serialText, shortDate } from "./format";
import type { Collections } from "./pick";
import { type ClockRow, clockRows, firstSenderInClock } from "./trade-clock";

/** Reads the clock here: the compiler takes `Date.now` in a component body as a render-time call. */
const readRows = (trade: Trade) => clockRows(trade, Date.now());

/** A timeline mark: filled for what is done, indigo for today, hollow for what is ahead. */
export function Dot({ className }: { className: string }) {
  return <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", className)} />;
}

const DOT = {
  past: "bg-muted-foreground",
  today: "bg-progress",
  future: "border-border bg-card border-2",
} as const;

function label(row: ClockRow, name: string, collections: Collections) {
  switch (row.kind) {
    case "accepted":
      return m.offer_trade_accepted();
    case "sent":
      return row.leg.fromYou
        ? m.offer_clock_you_sent({ objekt: itemLabel(row.leg, collections) })
        : m.offer_clock_they_sent({ name, objekt: itemLabel(row.leg, collections) });
    case "copyDue":
      return m.offer_clock_copy_due({
        sent: serialText({ serial: row.copy.serial, estimated: row.copy.serialEstimated }),
      });
    case "reminder":
      return m.offer_clock_reminder();
    case "report":
      return m.offer_clock_report();
    case "today":
      return m.offer_clock_today();
    case "ends":
      return row.outcome === "failed"
        ? m.offer_clock_ends_failed()
        : m.offer_clock_ends_cancelled();
    case "rate":
      return m.offer_clock_rate();
  }
}

/** This trade's dated events while it is in progress, and the full rules one tap away. */
export function TradeClockPanel({
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
  // where Today sits and which rows are past follow the viewer's clock, so they wait for the client
  const rows = readRows(trade).filter((row) => hydrated || row.kind !== "today");
  const first = trade.firstSender;
  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4 text-sm">
      <h3 className="font-medium">{m.offer_clock_title()}</h3>
      <ol className="flex flex-col gap-2.5">
        {rows.map((row, index) => (
          <li key={`${row.kind}-${index}`} className="flex items-start gap-2.5">
            <Dot className={DOT[hydrated ? row.when : "future"]} />
            <span className="flex min-w-0 flex-1 flex-col text-pretty wrap-anywhere">
              <span className={cn(row.kind === "today" && "text-progress font-medium")}>
                {label(row, name, collections)}
              </span>
              {row.kind === "rate" ? (
                <span className="text-muted-foreground text-xs">{m.offer_clock_rate_hint()}</span>
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
      {first && firstSenderInClock(trade) ? <FirstLine first={first} name={name} /> : null}
      <Popover>
        <PopoverTrigger className="text-muted-foreground hover:text-foreground w-fit text-xs underline underline-offset-2">
          {m.offer_clock_how()}
        </PopoverTrigger>
        <PopoverPopup align="start">
          <div className="flex max-w-72 flex-col gap-2 text-xs text-pretty">
            <p>{m.offer_stall_body()}</p>
            <p className="text-muted-foreground">{m.offer_first_hint()}</p>
          </div>
        </PopoverPopup>
      </Popover>
    </section>
  );
}

function FirstLine({
  first,
  name,
}: {
  first: NonNullable<Trade["firstSender"]>;
  name: string;
}): ReactNode {
  const headline = first.you ? m.offer_first_you() : m.offer_first_them({ name });
  const follow = first.sent
    ? first.you
      ? m.offer_first_you_sent()
      : m.offer_first_them_sent({ name })
    : null;
  return (
    <p className="text-muted-foreground border-t pt-3 text-xs text-pretty">
      {headline}
      {follow ? <> {follow}</> : null}
    </p>
  );
}
