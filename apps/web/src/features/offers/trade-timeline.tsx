import { CaretDownIcon } from "@phosphor-icons/react";
import type { TradeView as Trade } from "@repo/api/schemas/offer";
import { truncateAddress } from "@repo/lib/address";
import { useId, type ReactNode } from "react";

import { CopyButton } from "@/components/shared/copy-button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { TONE_SOLID, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { itemLabel, serialText, shortDate, tradeStatusText } from "./format";
import type { Collections } from "./pick";
import { firstSenderInClock, nextRow, type TimelineRow, timelineRows } from "./trade-clock";
import { InPlaceOf } from "./wrong-copy";

/** Reads the clock here: the compiler takes `Date.now` in a component body as a render-time call. */
const readRows = (trade: Trade, hydrated: boolean) =>
  timelineRows(trade, Date.now(), { fold: hydrated });

const END_TONE: Record<Trade["status"], Tone> = {
  in_progress: "progress",
  completed: "success",
  failed: "destructive",
  cancelled: "neutral",
};

const DOT = {
  past: "bg-muted-foreground",
  today: "bg-progress",
  future: "border-border bg-card border-2",
  paused: "border-muted-foreground border-2 border-dashed",
} as const;

function dotClass(row: TimelineRow, trade: Trade, hydrated: boolean) {
  if (row.kind === "end") return TONE_SOLID[END_TONE[trade.status]];
  if (!hydrated) return DOT.future;
  if (row.kind === "copyArrived" && row.copy.status === "pending") return TONE_SOLID.warning;
  return DOT[row.when];
}

function label(row: TimelineRow, trade: Trade, name: string, collections: Collections) {
  switch (row.kind) {
    case "proposed":
      return m.offer_trade_proposed();
    case "accepted":
      return m.offer_trade_accepted();
    case "sent":
      return row.leg.fromYou
        ? m.offer_clock_you_sent({ objekt: itemLabel(row.leg, collections) })
        : m.offer_clock_they_sent({ name, objekt: itemLabel(row.leg, collections) });
    case "sentGroup": {
      const counts = { count: row.legs.length, total: row.total };
      return row.fromYou
        ? m.offer_clock_you_sent_many(counts)
        : m.offer_clock_they_sent_many({ name, ...counts });
    }
    case "copyArrived": {
      const sent = serialText({ serial: row.copy.serial, estimated: row.copy.serialEstimated });
      return row.leg.fromYou
        ? m.offer_timeline_copy_you_sent({ sent })
        : m.offer_timeline_copy_they_sent({ name, sent });
    }
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
      return row.outcome === "completed"
        ? m.offer_clock_ends_completed()
        : row.outcome === "failed"
          ? m.offer_clock_ends_failed()
          : m.offer_clock_ends_cancelled();
    case "rate":
      return m.offer_clock_rate();
    case "end":
      return tradeStatusText(trade.status);
    case "rateCloses":
      return m.offer_timeline_rate_closes();
  }
}

function Sub({ row }: { row: TimelineRow }): ReactNode {
  if (row.kind === "rate") {
    return <span className="text-muted-foreground text-xs">{m.offer_clock_rate_hint()}</span>;
  }
  if (row.kind === "ends" && row.when === "paused") {
    return <span className="text-muted-foreground text-xs">{m.offer_deadline_paused()}</span>;
  }
  if (row.kind === "copyArrived") {
    return (
      <span className="text-muted-foreground text-xs">
        {m.offer_timeline_copy_asks({
          asked: serialText({ serial: row.leg.serial, estimated: row.leg.serialEstimated }),
        })}
        {row.copy.status === "declined" ? <> · {m.offer_wrong_copy_declined()}</> : null}
      </span>
    );
  }
  if (row.kind === "sent") return <InPlaceOf leg={row.leg} />;
  return null;
}

function Hash({ hash }: { hash: string | null }) {
  if (!hash) return null;
  return (
    <span className="text-muted-foreground flex items-center gap-x-1 text-xs">
      <span className="font-mono" title={hash}>
        {truncateAddress(hash)}
      </span>
      <CopyButton text={hash} label={m.offer_copy_hash()} toastTitle={m.offer_hash_copied()} />
    </span>
  );
}

type Props = { trade: Trade; collections: Collections; name: string; hydrated: boolean };

/** A day's transfers by one party: the row opens to each one with its objekt and hash. */
function SentGroup({
  row,
  collections,
  label: text,
}: {
  row: Extract<TimelineRow, { kind: "sentGroup" }>;
  collections: Collections;
  label: string;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group/sent focus-visible:ring-ring flex items-center gap-1 rounded-sm text-start outline-none focus-visible:ring-2">
        {text}
        <CaretDownIcon
          aria-hidden
          className="text-muted-foreground size-3.5 shrink-0 group-data-panel-open/sent:rotate-180 motion-safe:transition-transform"
        />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <ul className="mt-1.5 flex flex-col gap-2 border-s ps-3">
          {row.legs.map((leg) => (
            <li key={leg.id} className="flex flex-col">
              <span className="text-xs">{itemLabel(leg, collections)}</span>
              <InPlaceOf leg={leg} />
              <Hash hash={leg.txHash} />
            </li>
          ))}
        </ul>
      </CollapsiblePanel>
    </Collapsible>
  );
}

function Rows({ trade, collections, name, hydrated, rows }: Props & { rows: TimelineRow[] }) {
  return (
    <ol className="flex flex-col gap-3 text-sm">
      {rows.map((row, index) => {
        const ahead = hydrated && (row.when === "future" || row.when === "paused");
        return (
          <li key={`${row.kind}-${index}`} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", dotClass(row, trade, hydrated))}
            />
            <span className="flex min-w-0 flex-1 flex-col text-pretty wrap-anywhere">
              <span
                className={cn(
                  row.kind === "today" && "text-progress font-semibold",
                  ahead && "text-muted-foreground",
                )}
              >
                {row.kind === "sentGroup" ? (
                  <SentGroup
                    row={row}
                    collections={collections}
                    label={label(row, trade, name, collections)}
                  />
                ) : (
                  label(row, trade, name, collections)
                )}
              </span>
              <Sub row={row} />
              {row.kind === "sent" || row.kind === "copyArrived" ? (
                <Hash hash={row.txHash} />
              ) : null}
            </span>
            {row.at && hydrated ? (
              <time
                dateTime={row.at}
                className={cn(
                  "shrink-0 font-mono text-xs tabular-nums",
                  row.kind === "today" ? "text-progress" : "text-muted-foreground",
                )}
              >
                {shortDate(row.at)}
              </time>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Footer({ trade, name }: { trade: Trade; name: string }) {
  const first = trade.firstSender;
  return (
    <>
      {first && firstSenderInClock(trade) ? (
        <p className="text-muted-foreground border-t pt-3 text-xs text-pretty">
          {first.you ? m.offer_first_you() : m.offer_first_them({ name })}
          {first.sent ? (
            <> {first.you ? m.offer_first_you_sent() : m.offer_first_them_sent({ name })}</>
          ) : null}
        </p>
      ) : null}
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
    </>
  );
}

/**
 * Every event of the trade, then Today, then what lies ahead. From `sm` it is a card; on a phone
 * it folds behind a disclosure that names the next event.
 */
export function TradeTimeline(props: Props) {
  const { trade, collections, name, hydrated } = props;
  const titleId = useId();
  // where Today sits and which rows are past follow the viewer's clock, so they wait for the client
  const rows = readRows(trade, hydrated).filter((row) => hydrated || row.kind !== "today");
  const next = hydrated ? nextRow(rows) : null;
  // with nothing ahead, the fold names how the trade ended
  const shown = next ?? (hydrated ? rows.at(-1) : undefined);
  const event = shown
    ? [
        label(shown, trade, name, collections),
        shown.when === "paused" ? m.offer_deadline_paused() : shown.at ? shortDate(shown.at) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  const summary = event && next ? m.offer_timeline_next({ event }) : event;

  return (
    <>
      <section
        aria-labelledby={titleId}
        className="bg-card flex flex-col gap-3.5 rounded-xl border p-4 max-sm:hidden"
      >
        <h2 id={titleId} className="text-sm font-semibold">
          {m.offer_timeline_title()}
        </h2>
        <Rows {...props} rows={rows} />
        <Footer trade={trade} name={name} />
      </section>
      <Collapsible className="bg-card rounded-xl border sm:hidden">
        <CollapsibleTrigger className="flex min-h-12 w-full items-center gap-2 px-4 text-start text-sm font-semibold">
          <span className="shrink-0">{m.offer_timeline_title()}</span>
          {summary ? (
            <span className="text-muted-foreground ms-auto min-w-0 truncate text-xs font-normal">
              {summary}
            </span>
          ) : (
            <span className="ms-auto" />
          )}
          <CaretDownIcon
            aria-hidden
            className="text-muted-foreground size-4 shrink-0 in-data-panel-open:rotate-180 motion-safe:transition-transform"
          />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <div className="flex flex-col gap-3.5 px-4 pt-1 pb-4">
            <Rows {...props} rows={rows} />
            <Footer trade={trade} name={name} />
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </>
  );
}
