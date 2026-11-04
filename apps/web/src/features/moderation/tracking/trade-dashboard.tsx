import { OFFER_CANCEL_REASONS } from "@repo/api/schemas/offer";
import type {
  StaffDays,
  TradeAttention,
  TradeTotals,
  TrackerHealth,
} from "@repo/api/schemas/staff-totals";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactNode, useId, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tradeNo } from "@/features/offers/format";
import { isNotFound } from "@/lib/orpc-error";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { When } from "../console/when";
import { parseTradeNumber, sharePercent, spanText } from "./format";
import {
  ATTENTION_BADGE,
  ATTENTION_DETAIL,
  ATTENTION_LABEL,
  OFFER_CANCEL_LABEL,
  TRADE_END_LABEL,
} from "./labels";
import {
  count,
  CountedAt,
  DayBars,
  LabelledBars,
  LoadFailed,
  PersonLink,
  RangeControl,
  Slotted,
  Stat,
  TableFrame,
} from "./parts";
import {
  staffTradeOptions,
  trackerHealthOptions,
  tradeAttentionOptions,
  tradeTotalsOptions,
} from "./queries";

/** Top to bottom: tracker health, the range's figures, two charts, endings, attention, breakers. */
export function TradeDashboard({ days }: { days: StaffDays }) {
  const totals = useQuery(tradeTotalsOptions(days));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={m.mod_trades_title()}
        description={
          <span className="flex flex-col gap-0.5">
            <span>{m.mod_trades_description()}</span>
            {totals.data ? <CountedAt iso={totals.data.countedAt} /> : null}
          </span>
        }
        aside={
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <RangeControl days={days} to="/mod/trades" />
            <GoToTrade />
          </div>
        }
      />
      <HealthStrip />
      {totals.isPending ? (
        <TotalsSkeleton />
      ) : totals.isError ? (
        <LoadFailed onRetry={() => void totals.refetch()} />
      ) : (
        <Totals totals={totals.data} />
      )}
      <Attention days={days} />
    </div>
  );
}

function GoToTrade() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const inputId = useId();
  const errorId = useId();

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("trade");
    const tradeId = parseTradeNumber(typeof text === "string" ? text : "");
    if (tradeId === null) {
      setError(m.mod_trades_goto_invalid());
      return;
    }
    setError(null);
    setLooking(true);
    try {
      // looked up first, so a number with no trade stays on the tab with its message
      await queryClient.fetchQuery(staffTradeOptions(tradeId));
      await navigate({ to: "/mod/trades/$tradeId", params: { tradeId: String(tradeId) } });
    } catch (caught) {
      setError(isNotFound(caught) ? m.mod_trades_goto_missing() : m.mod_trades_goto_failed());
    } finally {
      setLooking(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => void open(event)} className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-muted-foreground text-xs">
        {m.mod_trades_goto_label()}
      </label>
      <div className="flex gap-1.5">
        <Input
          id={inputId}
          name="trade"
          size="sm"
          autoComplete="off"
          placeholder={m.mod_trades_goto_placeholder()}
          className="w-28 font-mono"
          aria-invalid={error === null ? undefined : true}
          aria-describedby={errorId}
          onChange={() => setError(null)}
        />
        <Button type="submit" size="sm" variant="outline" disabled={looking}>
          {m.mod_trades_goto_submit()}
        </Button>
      </div>
      <p
        id={errorId}
        aria-live="polite"
        className="text-destructive-foreground text-xs empty:hidden"
      >
        {error}
      </p>
    </form>
  );
}

function HealthStrip() {
  const query = useQuery(trackerHealthOptions());
  if (query.isPending) return <Skeleton className="h-10 rounded-md" />;
  if (query.isError) return <LoadFailed onRetry={() => void query.refetch()} />;
  return <HealthLine health={query.data} />;
}

function HealthLine({ health }: { health: TrackerHealth }) {
  const { indexer } = health;
  const behind = indexer.state === "known" && indexer.behind;
  return (
    <section
      aria-label={m.mod_trades_health_label()}
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border px-3 py-2 text-sm",
        behind && "border-warning/30 bg-warning/8 text-warning-foreground dark:bg-warning/16",
      )}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            indexer.state === "unknown"
              ? "bg-muted-foreground"
              : behind
                ? "bg-warning"
                : "bg-success",
          )}
        />
        {indexer.state === "unknown"
          ? m.mod_trades_health_unknown()
          : behind
            ? m.mod_trades_health_behind()
            : m.mod_trades_health_caught_up()}
      </span>
      <span className={cn("flex flex-wrap gap-x-4 gap-y-1", !behind && "text-muted-foreground")}>
        {indexer.state === "known" ? (
          <span>
            <Slotted
              text={(time) =>
                m.mod_trades_health_read_up_to({
                  time,
                  ago: spanText(
                    (Date.parse(health.checkedAt) - Date.parse(indexer.seenUntil)) / 1000,
                    getLocale(),
                  ),
                })
              }
              node={<When iso={indexer.seenUntil} className="tabular-nums" />}
            />
          </span>
        ) : null}
        <span>
          {health.verifierLastRun === null ? (
            m.mod_trades_health_verifier_unknown()
          ) : (
            <Slotted
              text={(time) => m.mod_trades_health_verifier({ time })}
              node={<When iso={health.verifierLastRun} className="tabular-nums" />}
            />
          )}
        </span>
        <span className="tabular-nums">
          {m.mod_trades_health_open({
            legs: count(health.open.legs),
            away: count(health.open.away),
            stuck: count(health.open.stuck),
            copies: count(health.open.copies),
          })}
        </span>
        {behind ? <span>{m.mod_trades_health_behind_hint()}</span> : null}
      </span>
    </section>
  );
}

function Tile({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col rounded-lg border p-3">{children}</div>;
}

function Totals({ totals }: { totals: TradeTotals }) {
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

function TotalsSkeleton() {
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

function Attention({ days }: { days: StaffDays }) {
  const query = useQuery(tradeAttentionOptions(days));
  if (query.isPending) return <Skeleton className="h-40 rounded-lg" />;
  if (query.isError) return <LoadFailed onRetry={() => void query.refetch()} />;
  const { rows, total, repeatBreakers } = query.data;
  return (
    <>
      <section aria-labelledby="mod-attention" className="flex flex-col gap-2">
        <h2 id="mod-attention" className="text-sm font-semibold">
          {m.mod_trades_attention_title()}{" "}
          <span className="text-muted-foreground font-normal tabular-nums">{count(total)}</span>
        </h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
            {m.mod_trades_attention_empty()}
          </p>
        ) : (
          <AttentionTable rows={rows} />
        )}
        {total > rows.length ? (
          <p className="text-muted-foreground text-xs tabular-nums">
            {m.mod_trades_attention_capped({ shown: count(rows.length), total: count(total) })}
          </p>
        ) : null}
      </section>
      <section aria-labelledby="mod-breakers" className="flex flex-col gap-2">
        <h2 id="mod-breakers" className="text-sm font-semibold">
          {m.mod_trades_breakers_title()}
        </h2>
        {repeatBreakers.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.mod_trades_breakers_empty()}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {repeatBreakers.map((row) => (
              <li key={row.person.userId} className="flex items-center gap-2">
                <PersonLink person={row.person} />
                <span className="text-muted-foreground tabular-nums">
                  {m.mod_trades_breakers_count({ count: count(row.failed) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function AttentionTable({ rows }: { rows: TradeAttention["rows"] }) {
  return (
    <TableFrame>
      <Table variant="card">
        <TableHeader>
          <TableRow>
            <TableHead>{m.mod_trades_col_trade()}</TableHead>
            <TableHead>{m.mod_trades_col_why()}</TableHead>
            <TableHead>{m.mod_trades_col_between()}</TableHead>
            <TableHead>{m.mod_trades_col_accepted()}</TableHead>
            <TableHead>{m.mod_trades_col_legs()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.tradeId}>
              <TableCell>
                {/* the link covers the row; the account links sit above it */}
                <Link
                  to="/mod/trades/$tradeId"
                  params={{ tradeId: String(row.tradeId) }}
                  className="font-mono text-xs font-medium after:absolute after:inset-0 hover:underline"
                >
                  {tradeNo(row.tradeId)}
                </Link>
              </TableCell>
              <TableCell>
                <ul className="flex flex-col gap-1">
                  {row.reasons.map((reason) => (
                    <li key={reason.reason} className="flex flex-wrap items-center gap-x-2">
                      <Badge variant={ATTENTION_BADGE[reason.reason]}>
                        {ATTENTION_LABEL[reason.reason]()}
                      </Badge>
                      {reason.at === null ? null : (
                        <span className="text-muted-foreground text-xs">
                          <Slotted
                            text={(time) => ATTENTION_DETAIL[reason.reason]({ time })}
                            node={<When iso={reason.at} className="tabular-nums" />}
                          />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </TableCell>
              <TableCell>
                <span className="flex flex-col">
                  {row.parties.map((person) => (
                    <PersonLink
                      key={person.userId}
                      person={person}
                      className="relative z-10 block max-w-48 truncate"
                    />
                  ))}
                </span>
              </TableCell>
              <TableCell>
                <When iso={row.acceptedAt} className="tabular-nums" />
              </TableCell>
              <TableCell className="tabular-nums">
                {m.offer_trade_step_progress({
                  verified: count(row.legsDone),
                  total: count(row.legsTotal),
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  );
}
