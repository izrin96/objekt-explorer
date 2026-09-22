import { ChartPieSliceIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useMemo } from "react";
import { Pie, PieChart } from "recharts";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useFilterData } from "@/features/filters/filter-data-provider";
import { LONG_TAIL } from "@/features/filters/filter-popover";
import { useMemberColor } from "@/features/filters/member-colors";
import { useResetFilters } from "@/features/filters/use-filters";
import { m } from "@/paraglide/messages";

import { CheckpointPopover } from "../checkpoint-popover";
import { ProfileToolbar } from "../profile-toolbar";
import { MemberProgressChart, useChartMembers } from "../progress/member-progress-chart";
import { memberProgress } from "../progress/shape-progress";
import { useProfileCatalogue } from "../use-profile-objekts";

type Slice = { name: string; count: number; percentage: number; fill: string };

/** the season palette is keyed on the season name with its trailing digits dropped */
function seasonFill(season: string): string {
  return `var(--season-${season.replace(/\d+$/, "").toLowerCase()})`;
}

/**
 * One slice per name the roster declares, so a member or a season the profile
 * holds nothing of still reads as an explicit zero rather than going missing.
 */
function toSlices(
  names: readonly string[],
  counts: ReadonlyMap<string, number>,
  fill: (name: string) => string,
): Slice[] {
  const total = names.reduce((sum, name) => sum + (counts.get(name) ?? 0), 0);
  return names
    .map((name) => {
      const count = counts.get(name) ?? 0;
      return {
        name,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
        fill: fill(name),
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** A unit objekt lists every member it carries and counts towards each of them. */
function tally(objekts: readonly ValidObjekt[], keys: (objekt: ValidObjekt) => readonly string[]) {
  const counts = new Map<string, number>();
  for (const objekt of objekts) {
    for (const key of keys(objekt)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

const PIE_CONFIG = {} satisfies ChartConfig;

function BreakdownPie({ data, label }: { data: Slice[]; label: string }) {
  return (
    <Chart
      layout="radial"
      data={data}
      dataKey="count"
      config={PIE_CONFIG}
      containerHeight={450}
      className="size-full"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelSeparator={false}
              hideLabel
              formatter={(value, _name, item) => {
                const row = data.find((candidate) => candidate.name === item.payload?.name);
                if (!row) return null;
                return (
                  <>
                    {/* a pale member colour is the tooltip's own surface without
                        an edge of its own, so every swatch is ringed */}
                    <div
                      className="ring-foreground/15 size-2.5 shrink-0 rounded-full bg-(--swatch) ring-1"
                      style={{ "--swatch": row.fill } as React.CSSProperties}
                    />
                    <div className="flex flex-1 items-center justify-between leading-none">
                      <span className="text-foreground">{row.name}</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {row.percentage}% ({String(value)})
                      </span>
                    </div>
                  </>
                );
              }}
            />
          }
        />
        <Pie
          animationBegin={0}
          animationDuration={500}
          startAngle={90}
          endAngle={-270}
          data={data}
          dataKey="count"
          nameKey="name"
          aria-label={label}
        />
      </PieChart>
    </Chart>
  );
}

function StatsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-popover rounded-lg">
      <CardHeader className="gap-1 p-4 pb-0">
        <CardTitle className="font-display text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export function StatsView() {
  const { owned, catalogue, isPending } = useProfileCatalogue();
  const memberColor = useMemberColor();
  const members = useChartMembers();
  const { seasons } = useFilterData();
  const reset = useResetFilters();

  const byMember = useMemo(
    () =>
      toSlices(
        members.map((member) => member.name),
        tally(owned, (objekt) => objekt.members),
        memberColor,
      ),
    [owned, members, memberColor],
  );
  const bySeason = useMemo(
    () =>
      toSlices(
        seasons,
        tally(owned, (objekt) => [objekt.season]),
        seasonFill,
      ),
    [owned, seasons],
  );
  const progress = useMemo(() => {
    const ownedSlugs = new Set(owned.map((objekt) => objekt.slug));
    return memberProgress(catalogue, ownedSlugs, members).toSorted(
      (a, b) => b.pct - a.pct || b.total - a.total,
    );
  }, [owned, catalogue, members]);

  return (
    <>
      <ProfileToolbar
        longTail={LONG_TAIL.stats}
        showSearch={false}
        showSort={false}
        showColumns={false}
        extra={<CheckpointPopover />}
      />

      {isPending ? (
        <Shimmer className="h-64 w-full rounded-lg" />
      ) : owned.length === 0 ? (
        <EmptyState
          icon={ChartPieSliceIcon}
          title={m.stats_empty_title()}
          hint={m.stats_empty_hint()}
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              {m.filter_reset_filter()}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,520px),1fr))] gap-4">
          <StatsCard
            title={m.stats_breakdown_member_title()}
            description={m.stats_breakdown_member_description()}
          >
            <BreakdownPie data={byMember} label={m.stats_breakdown_member_title()} />
          </StatsCard>
          <StatsCard
            title={m.stats_breakdown_season_title()}
            description={m.stats_breakdown_season_description()}
          >
            <BreakdownPie data={bySeason} label={m.stats_breakdown_season_title()} />
          </StatsCard>
          <StatsCard
            title={m.stats_member_progress_title()}
            description={m.stats_member_progress_description()}
          >
            <MemberProgressChart rows={progress} />
          </StatsCard>
        </div>
      )}
    </>
  );
}
