import type { StaffDays } from "@repo/api/schemas/staff-totals";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { m } from "@/paraglide/messages";

import { Attention } from "./dashboard-attention";
import { HealthStrip } from "./dashboard-health";
import { Totals, TotalsSkeleton } from "./dashboard-totals";
import { GoToTrade } from "./go-to-trade";
import { CountedAt, LoadFailed, RangeControl } from "./parts";
import { tradeTotalsOptions } from "./queries";

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
