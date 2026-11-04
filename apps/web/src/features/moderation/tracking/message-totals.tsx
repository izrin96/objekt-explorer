import { FLAG_CATEGORIES } from "@repo/api/schemas/chat";
import { REPORT_REASONS, SANCTION_TYPES } from "@repo/api/schemas/moderation";
import type { MessageTotals, StaffDays } from "@repo/api/schemas/staff-totals";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { m } from "@/paraglide/messages";

import { FLAG_LABEL, REASON_LABEL, SANCTION_LABEL } from "../labels";
import {
  type BarTone,
  count,
  CountedAt,
  DayBars,
  LoadFailed,
  PersonLink,
  RangeControl,
  Stat,
  TableFrame,
} from "./parts";
import { messageTotalsOptions } from "./queries";

type Key = keyof MessageTotals["totals"]["sum"];

/** Counts only: the read behind it carries no message text, note, excerpt or reason. */
export function MessageTotalsView({ days }: { days: StaffDays }) {
  const query = useQuery(messageTotalsOptions(days));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={m.mod_messages_title()}
        description={
          <span className="flex flex-col gap-0.5">
            <span>{m.mod_messages_description()}</span>
            {query.data ? <CountedAt iso={query.data.countedAt} /> : null}
          </span>
        }
        aside={<RangeControl days={days} to="/mod/messages" />}
      />
      {query.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <LoadFailed onRetry={() => void query.refetch()} />
      ) : (
        <Totals totals={query.data} />
      )}
    </div>
  );
}

function Totals({ totals }: { totals: MessageTotals }) {
  const { sum } = totals.totals;
  const series = (key: Key) =>
    totals.totals.days.map((d) => ({ day: d.day, count: d.counts[key] }));
  const breakdown = (rows: { label: string; count: number }[]) => {
    const shown = rows.filter((row) => row.count > 0);
    return shown.length === 0
      ? undefined
      : shown.map((row) => `${row.label} ${count(row.count)}`).join(" · ");
  };
  const measures: { key: Key; label: string; tone: BarTone; hint?: string }[] = [
    { key: "messages", label: m.mod_messages_messages(), tone: "neutral" },
    { key: "conversations", label: m.mod_messages_conversations(), tone: "neutral" },
    { key: "flags", label: m.mod_messages_flags(), tone: "warning" },
    {
      key: "reports",
      label: m.mod_messages_reports(),
      tone: "destructive",
      hint: breakdown(
        REPORT_REASONS.map((reason) => ({
          label: REASON_LABEL[reason](),
          count: sum[`report_${reason}`],
        })),
      ),
    },
    {
      key: "sanctions",
      label: m.mod_messages_sanctions(),
      tone: "destructive",
      hint: breakdown(
        SANCTION_TYPES.map((type) => ({
          label: SANCTION_LABEL[type](),
          count: sum[`sanction_${type}`],
        })),
      ),
    },
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {measures.map((measure) => (
          <section key={measure.key} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
            <Stat label={measure.label} value={count(sum[measure.key])} hint={measure.hint} />
            <DayBars
              title={measure.label}
              days={series(measure.key)}
              tone={measure.tone}
              className="mt-auto"
            />
          </section>
        ))}
        <section className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
          <h2 className="text-muted-foreground text-xs font-normal">
            {m.mod_messages_flags_by_category()}
          </h2>
          <dl className="flex flex-col gap-1 text-sm">
            {FLAG_CATEGORIES.map((category) => (
              <div key={category} className="flex justify-between gap-2">
                <dt>{FLAG_LABEL[category]()}</dt>
                <dd className="font-semibold tabular-nums">{count(sum[`flag_${category}`])}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <section aria-labelledby="mod-most-flagged" className="flex flex-col gap-2">
        <h2 id="mod-most-flagged" className="text-sm font-semibold">
          {m.mod_messages_most_flagged()}
        </h2>
        {totals.mostFlagged.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.mod_messages_most_flagged_empty()}</p>
        ) : (
          <TableFrame>
            <Table variant="card">
              <TableHeader>
                <TableRow>
                  <TableHead>{m.mod_messages_col_account()}</TableHead>
                  {FLAG_CATEGORIES.map((category) => (
                    <TableHead key={category} className="text-end">
                      {FLAG_LABEL[category]()}
                    </TableHead>
                  ))}
                  <TableHead className="text-end">{m.mod_messages_col_total()}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totals.mostFlagged.map((row) => (
                  <TableRow key={row.person.userId}>
                    <TableCell>
                      <PersonLink person={row.person} />
                    </TableCell>
                    {FLAG_CATEGORIES.map((category) => (
                      <TableCell key={category} className="text-end tabular-nums">
                        {count(row.counts[category])}
                      </TableCell>
                    ))}
                    <TableCell className="text-end font-medium tabular-nums">
                      {count(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        )}
      </section>
    </>
  );
}
