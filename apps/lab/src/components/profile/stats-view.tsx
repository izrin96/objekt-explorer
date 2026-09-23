import { ChartPieSliceIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Pie, PieChart } from "recharts";

import { useScopedFacets } from "@/components/filters/facets";
import { matchesFacets, useFilters } from "@/components/filters/filter-store";
import { memberColor } from "@/components/filters/member-colors";
import { MemberProgressChart } from "@/components/profile/member-progress-chart";
import type { Profile } from "@/components/profile/profile-data";
import { ProfileToolbar, SnapshotPopover } from "@/components/profile/profile-toolbar";
import { memberProgress } from "@/components/profile/progress-data";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart, type ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { objekts } from "@/fixtures/objekts";
import { useSnapshotProfile } from "@/store/snapshot";

/** `stats_*` in `apps/website/messages/en.json` */
const COPY = {
  /** stats_breakdown_member_title / _description */
  member: { title: "Objekt Breakdown By Member", description: "Total objekt by member" },
  /** stats_breakdown_season_title / _description */
  season: { title: "Objekt Breakdown By Season", description: "Total objekt by season" },
  /** stats_member_progress_title / _description */
  progress: { title: "Member Progress", description: "Progress by member" },
} as const;

/** one slice: the two pies are the same chart with a different colour source */
type Slice = { name: string; count: number; percentage: number; fill: string };

/** the website's `--season-<base>`: the season name with its trailing digits dropped */
function seasonFill(season: string): string {
  return `var(--season-${season.replace(/\d+$/, "").toLowerCase()})`;
}

function toSlices(counts: ReadonlyMap<string, number>, fill: (name: string) => string): Slice[] {
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const rows = [...counts.entries()].map(([name, count]): Slice => ({
    name,
    count,
    percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    fill: fill(name),
  }));
  return rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function tally<T>(rows: readonly T[], key: (row: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

const PIE_CONFIG = {} satisfies ChartConfig;

/**
 * The card body both breakdowns share: a full-circle pie drawn clockwise from
 * twelve o'clock, with one tooltip row per slice. The website has this twice
 * with only the colour source differing, so the lab has it once.
 */
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
                const row = data.find((d) => d.name === item.payload?.name);
                if (!row) return null;
                return (
                  <>
                    {/* a pale member colour is the tooltip's own surface
                        colour without an edge of its own, so every swatch is
                        ringed */}
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
  copy,
  children,
}: {
  copy: { title: string; description: string };
  children: React.ReactNode;
}) {
  return (
    /* `bg-popover`, not the cnippet card's own `bg-card`: `--card` is
       `transparent` in the lab's dark theme, so a `bg-card` card is a border
       and nothing else */
    <Card className="bg-popover rounded-lg">
      <CardHeader className="gap-1 p-4 pb-0">
        <CardTitle className="font-display text-[15px]">{copy.title}</CardTitle>
        <CardDescription className="text-[13px]">{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

/**
 * Profile Statistics tab: three cards over the objekts this profile holds,
 * narrowed by the toolbar's facets through the same `matchesFacets` the
 * Collection and Progress tabs run — so one facet moves all three at once.
 *
 * The toolbar keeps the facets and the snapshot control and drops search, sort
 * and columns: none of the three describes a set, and the tab has no grid to
 * order or to lay out.
 */
export function StatsView({ profile: live }: { profile: Profile }) {
  const filters = useFilters();
  const { scope } = useScopedFacets();
  // the owned side of every number moves with the snapshot; the catalogue the
  // percentages are measured against does not
  const { profile } = useSnapshotProfile(live);

  const owned = useMemo(
    () => profile.objekts.filter((o) => matchesFacets(o, filters, scope)),
    [profile.objekts, filters, scope],
  );

  const catalogue = useMemo(
    () => objekts.filter((o) => matchesFacets(o, filters, scope)),
    [filters, scope],
  );

  const byMember = useMemo(
    () =>
      toSlices(
        tally(owned, (o) => o.member),
        memberColor,
      ),
    [owned],
  );
  const bySeason = useMemo(
    () =>
      toSlices(
        tally(owned, (o) => o.season),
        seasonFill,
      ),
    [owned],
  );
  const progress = useMemo(
    () => memberProgress(catalogue, profile.objekts),
    [catalogue, profile.objekts],
  );

  return (
    <>
      <ProfileToolbar
        showSearch={false}
        showSort={false}
        showColumns={false}
        extra={<SnapshotPopover nickname={profile.nickname} />}
      />

      {owned.length === 0 ? (
        <EmptyState
          icon={ChartPieSliceIcon}
          title="Nothing to count"
          hint={
            profile.objekts.length === 0
              ? `${profile.nickname} holds nothing yet, so there is no breakdown to draw.`
              : "No objekt on this profile is in scope under the current filters."
          }
          action={
            profile.objekts.length > 0 ? (
              <Button variant="outline" size="sm" onClick={filters.reset}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,520px),1fr))] gap-4">
          <StatsCard copy={COPY.member}>
            <BreakdownPie data={byMember} label={COPY.member.title} />
          </StatsCard>
          <StatsCard copy={COPY.season}>
            <BreakdownPie data={bySeason} label={COPY.season.title} />
          </StatsCard>
          <StatsCard copy={COPY.progress}>
            <MemberProgressChart rows={progress} />
          </StatsCard>
        </div>
      )}
    </>
  );
}
