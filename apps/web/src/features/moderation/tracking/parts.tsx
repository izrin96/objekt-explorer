import { ArrowClockwiseIcon, WarningIcon } from "@phosphor-icons/react";
import type { StaffDays } from "@repo/api/schemas/staff-totals";
import { STAFF_RANGE_DAYS } from "@repo/api/schemas/staff-totals";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bar, BarChart, XAxis } from "recharts";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { When } from "../console/when";
import { dayLabel } from "./format";

const SLOT = "\u{E000}";

/** A message with a node in place of one of its values, such as a time that renders once hydrated. */
export function Slotted({ text, node }: { text: (slot: string) => string; node: ReactNode }) {
  const [before, after] = text(SLOT).split(SLOT);
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}

export const count = (value: number) => value.toLocaleString(getLocale());

/** The range as links, so it lives in the URL and a reload keeps it. */
export function RangeControl({
  days,
  to,
}: {
  days: StaffDays;
  to: "/mod/trades" | "/mod/messages";
}) {
  return (
    <nav aria-label={m.mod_totals_range_label()} className="flex gap-1">
      {STAFF_RANGE_DAYS.map((option) => (
        <Button
          key={option}
          size="xs"
          variant={option === days ? "secondary" : "ghost"}
          className="tabular-nums"
          render={
            <Link
              to={to}
              search={{ days: option }}
              aria-current={option === days ? "page" : undefined}
              replace
            />
          }
        >
          {m.mod_totals_range_days({ days: count(option) })}
        </Button>
      ))}
    </nav>
  );
}

export function CountedAt({ iso }: { iso: string }) {
  return (
    <span className="text-muted-foreground text-xs">
      <Slotted
        text={(time) => m.mod_totals_counted({ time })}
        node={<When iso={iso} className="tabular-nums" />}
      />
      {" · "}
      {m.mod_totals_utc()}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {hint === undefined ? null : <span className="text-muted-foreground text-xs">{hint}</span>}
    </div>
  );
}

export type BarTone = "neutral" | "success" | "warning" | "destructive";

const BAR_COLOR: Record<BarTone, string> = {
  neutral: "var(--color-muted-foreground)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  destructive: "var(--color-destructive)",
};

/**
 * One bar per UTC day. The chart draws nothing until measured, so the same days go in a
 * visually hidden table that a screen reader always gets, with any `more` columns beside.
 */
export function DayBars({
  title,
  days,
  tone = "neutral",
  more = [],
  className,
}: {
  title: string;
  days: { day: string; count: number }[];
  tone?: BarTone;
  more?: { label: string; counts: number[] }[];
  className?: string;
}) {
  const locale = getLocale();
  const data = days.map((d) => ({ label: dayLabel(d.day, locale), count: d.count }));
  // a message read at module scope resolves once in the base locale on the server
  const config = { count: { label: title, color: BAR_COLOR[tone] } } satisfies ChartConfig;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <ChartContainer config={config} className="aspect-auto h-24 w-full">
        <BarChart data={data} title={title} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={2} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>{m.mod_totals_table_caption({ name: title })}</caption>
        <thead>
          <tr>
            <th scope="col">{m.mod_totals_day()}</th>
            <th scope="col">{title}</th>
            {more.map((column) => (
              <th key={column.label} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.day}>
              <th scope="row">{data[i]!.label}</th>
              <td>{count(d.count)}</td>
              {more.map((column) => (
                <td key={column.label}>{count(column.counts[i] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Counts as labelled bars against the largest, every label and number in the text. */
export function LabelledBars({
  title,
  rows,
  tone = "neutral",
}: {
  title: string;
  rows: { key: string; label: string; count: number }[];
  tone?: BarTone;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {rows.map((row) => (
          <li
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_--spacing(16)_--spacing(10)] items-center gap-2"
          >
            <span className="min-w-0">{row.label}</span>
            <span className="bg-muted h-1.5 rounded-full" aria-hidden>
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(row.count / max) * 100}%`,
                  backgroundColor: BAR_COLOR[tone],
                }}
              />
            </span>
            <span className="text-end tabular-nums">{count(row.count)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** An account linked to its console page; one that is gone reads as such, unlinked. */
export function PersonLink({
  person,
  className,
}: {
  person: { userId: string; name: string | null };
  className?: string;
}) {
  if (person.name === null) {
    return <span className={cn("text-muted-foreground", className)}>{m.mod_person_gone()}</span>;
  }
  return (
    <Link
      to="/mod/reports/$userId"
      params={{ userId: person.userId }}
      className={cn("font-medium hover:underline", className)}
    >
      {person.name}
    </Link>
  );
}

/** The vendored table's container scrolls below its width; this declares it a scroller. */
export function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div data-scroll-x className="min-w-0 overflow-x-clip">
      {children}
    </div>
  );
}

export function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={WarningIcon}
      title={m.common_error_loading_data()}
      action={
        <Button variant="outline" size="sm" onClick={onRetry}>
          <ArrowClockwiseIcon />
          {m.common_error_retry()}
        </Button>
      }
    />
  );
}
