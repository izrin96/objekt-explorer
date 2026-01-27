"use client";

import type React from "react";

import { seasonColors } from "@repo/cosmo/types/common";
import { type ValidObjekt } from "@repo/lib/objekts";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { Suspense, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Bar, BarChart, Pie, PieChart, Rectangle, XAxis, YAxis } from "recharts";

import ErrorFallbackRender from "@/components/error-boundary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart, type ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Loader } from "@/components/ui/loader";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";
import { useObjektFilter } from "@/hooks/use-objekt-filter";
import { useOwnedCollections } from "@/hooks/use-owned-collections";
import { useTarget } from "@/hooks/use-target";
import { collectionOptions } from "@/lib/query-options";
import { unobtainables } from "@/lib/unobtainables";
import { cn } from "@/utils/classes";

import StatsFilter from "./stats-filter";

export default function ProfileStatsRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <Suspense
            fallback={
              <div className="flex justify-center">
                <Loader variant="ring" />
              </div>
            }
          >
            <ProfileStats />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function ProfileStats() {
  const profile = useTarget((a) => a.profile)!;
  const filter = useObjektFilter();
  const { selectedArtistIds } = useCosmoArtist();

  const { objekts: allOwnedObjekts, hasNextPage } = useOwnedCollections(
    profile.address,
    selectedArtistIds,
  );
  const collectionQuery = useSuspenseQuery(collectionOptions(selectedArtistIds));

  const objekts = filter(allOwnedObjekts);

  const collections = filter(collectionQuery.data);

  return (
    <div className="flex flex-col gap-4">
      <StatsFilter />

      {hasNextPage && (
        <div className="flex items-center gap-2 text-xs font-semibold">
          Loading objekts <Loader variant="ring" className="size-4" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BreakdownByMemberChart objekts={objekts} />
        <BreakdownBySeasonChart objekts={objekts} />
        <MemberProgressChart objekts={objekts} collections={collections} />
      </div>
    </div>
  );
}

function BreakdownByMemberChart({ objekts }: { objekts: ValidObjekt[] }) {
  const { selectedArtists } = useCosmoArtist();

  const chartData = useMemo(() => {
    const members = selectedArtists
      .flatMap((a) => a.artistMembers)
      .map((a) => ({ color: a.primaryColorHex, name: a.name }));

    const data = members.map((a) => ({
      name: a.name,
      fill: a.color,
      count: objekts.filter((obj) => obj.member === a.name).length,
    }));
    const total = data.reduce((sum, d) => sum + d.count, 0);
    return data
      .map((d) =>
        Object.assign({}, d, {
          percentage: total > 0 ? Number(((d.count / total) * 100).toFixed(1)) : 0,
        }),
      )
      .toSorted((a, b) => b.count - a.count);
  }, [selectedArtists, objekts]);

  return (
    <Card>
      <CardHeader className="items-center pb-0">
        <CardTitle>Objekt Breakdown By Member</CardTitle>
        <CardDescription>Total objekt by member</CardDescription>
      </CardHeader>
      <CardContent>
        <Chart
          layout="radial"
          data={chartData}
          dataKey="count"
          config={{} satisfies ChartConfig}
          containerHeight={450}
          className="h-full w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelSeparator={false}
                  accessibilityLayer
                  hideLabel
                  formatter={(value, _name, _item, _index, payload) => (
                    <>
                      <div
                        className={cn(
                          "shrink-0 rounded-full border-(--color-border) bg-(--color-bg)",
                          "size-2.5",
                        )}
                        style={
                          {
                            "--color-bg": (payload as any).fill,
                            "--color-border": (payload as any).fill,
                          } as React.CSSProperties
                        }
                      />
                      <div
                        className={cn("flex flex-1 justify-between leading-none", "items-center")}
                      >
                        <div className="grid gap-1.5">
                          <span className="text-muted-fg">{(payload as any).name}</span>
                        </div>
                        <span className="text-fg font-medium tabular-nums">
                          {(payload as any).percentage}% ({value?.toLocaleString()})
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
            <Pie
              animationBegin={0}
              animationDuration={500}
              startAngle={90}
              endAngle={-270}
              data={chartData}
              dataKey="count"
              nameKey="name"
            />
          </PieChart>
        </Chart>
      </CardContent>
    </Card>
  );
}

function BreakdownBySeasonChart({ objekts }: { objekts: ValidObjekt[] }) {
  const { seasons } = useFilterData();

  const chartData = useMemo(() => {
    const data = seasons.map((season, i) => ({
      name: season,
      fill: seasonColors[i],
      count: objekts.filter((obj) => obj.season === season).length,
    }));
    const total = data.reduce((sum, d) => sum + d.count, 0);
    return data
      .map((d) =>
        Object.assign({}, d, {
          percentage: total > 0 ? Number(((d.count / total) * 100).toFixed(1)) : 0,
        }),
      )
      .toSorted((a, b) => b.count - a.count);
  }, [objekts, seasons]);

  return (
    <Card>
      <CardHeader className="items-center pb-0">
        <CardTitle>Objekt Breakdown By Season</CardTitle>
        <CardDescription>Total objekt by season</CardDescription>
      </CardHeader>
      <CardContent>
        <Chart
          layout="radial"
          data={chartData}
          dataKey="count"
          config={{} satisfies ChartConfig}
          containerHeight={450}
          className="h-full w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelSeparator={false}
                  accessibilityLayer
                  hideLabel
                  formatter={(value, _name, _item, _index, payload) => (
                    <>
                      <div
                        className={cn(
                          "shrink-0 rounded-full border-(--color-border) bg-(--color-bg)",
                          "size-2.5",
                        )}
                        style={
                          {
                            "--color-bg": (payload as any).fill,
                            "--color-border": (payload as any).fill,
                          } as React.CSSProperties
                        }
                      />
                      <div
                        className={cn("flex flex-1 justify-between leading-none", "items-center")}
                      >
                        <div className="grid gap-1.5">
                          <span className="text-muted-fg">{(payload as any).name}</span>
                        </div>
                        <span className="text-fg font-medium tabular-nums">
                          {(payload as any).percentage}% ({value?.toLocaleString()})
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
            <Pie
              animationBegin={0}
              animationDuration={500}
              startAngle={90}
              endAngle={-270}
              data={chartData}
              dataKey="count"
              nameKey="name"
            />
          </PieChart>
        </Chart>
      </CardContent>
    </Card>
  );
}

function MemberProgressChart({
  objekts,
  collections,
}: {
  objekts: ValidObjekt[];
  collections: ValidObjekt[];
}) {
  const [filters] = useFilters();
  const { selectedArtists } = useCosmoArtist();

  const chartData = useMemo(() => {
    const members = selectedArtists
      .flatMap((a) => a.artistMembers)
      .map((a) => ({ color: a.primaryColorHex, name: a.name }));

    const grouped = Object.values(groupBy(objekts, (a) => a.collectionId));

    return members
      .map((member) => {
        const owned = grouped.filter(([objekt]) => {
          return (
            objekt.member === member.name &&
            !unobtainables.includes(objekt.slug) &&
            !["Welcome", "Zero"].includes(objekt.class)
          );
        }).length;
        const total = collections.filter(
          (a) =>
            a.member === member.name &&
            !unobtainables.includes(a.slug) &&
            !["Welcome", "Zero"].includes(a.class),
        ).length;
        const percentage = total > 0 ? (owned / total) * 100 : 0;

        return {
          name: member.name,
          count: owned,
          total,
          percentage: Number(percentage.toFixed(1)),
          fill: member.color,
        };
      })
      .toSorted((a, b) => b.percentage - a.percentage);
  }, [selectedArtists, objekts, collections, filters]);

  const chartConfig = {
    percentage: {
      label: "Percentage",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member Progress</CardTitle>
        <CardDescription>Progress by member</CardDescription>
      </CardHeader>
      <CardContent>
        <Chart
          layout="vertical"
          data={chartData}
          dataKey="percentage"
          config={chartConfig}
          containerHeight={chartData.length * 40}
          className="w-full"
        >
          <BarChart accessibilityLayer data={chartData} layout="vertical" barSize={32}>
            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} />
            <XAxis dataKey="percentage" type="number" hide domain={[0, 100]} />
            <Bar
              animationBegin={0}
              animationDuration={500}
              dataKey="percentage"
              radius={5}
              shape={(props: any) => (
                <>
                  <Rectangle {...props} />
                  <text
                    x={props.background.width + props.x - 10}
                    y={props.y + 20}
                    textAnchor="end"
                    fill="var(--fg)"
                  >
                    {props.count}/{props.total} ({props.percentage}%)
                  </text>
                </>
              )}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelSeparator={false}
                  accessibilityLayer
                  indicator="line"
                  formatter={(value, _name, _item, _index, payload) => (
                    <>
                      <div
                        className={cn(
                          "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                          "w-1",
                        )}
                        style={
                          {
                            "--color-bg": (payload as any).fill,
                            "--color-border": (payload as any).fill,
                          } as React.CSSProperties
                        }
                      />
                      <div
                        className={cn("flex flex-1 justify-between leading-none", "items-center")}
                      >
                        <div className="grid gap-1.5">
                          {(payload as any).name}
                          <span className="text-fg">
                            {(payload as any).count}/{(payload as any).total}
                          </span>
                        </div>
                        <span className="text-fg font-mono font-medium tabular-nums">
                          {value?.toLocaleString()}%
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
          </BarChart>
        </Chart>
      </CardContent>
    </Card>
  );
}
