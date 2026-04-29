"use client";

import { type ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit/array";
import { useIntlayer } from "next-intlayer";
import dynamic from "next/dynamic";
import type React from "react";
import { Suspense, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Bar, BarChart, Pie, PieChart, Rectangle, XAxis, YAxis } from "recharts";

import ErrorFallbackRender from "@/components/error-boundary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/intentui/card";
import {
  Chart,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/intentui/chart";
import { Loader } from "@/components/intentui/loader";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";
import { useOwnedCollections } from "@/hooks/use-owned-collections";
import { useTarget } from "@/hooks/use-target";
import { filterObjekts } from "@/lib/filter-utils";
import { collectionOptions } from "@/lib/query-options";
import { getSeasonColor, tradeableFilter, cn } from "@/lib/utils";

import StatsFilter from "./stats-filter";

export default dynamic(() => Promise.resolve(ProfileStatsRender), {
  ssr: false,
});

export function ProfileStatsRender() {
  return (
    <div className="flex flex-col gap-4">
      <StatsFilter />
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
    </div>
  );
}

function ProfileStats() {
  const content = useIntlayer("stats");
  const profile = useTarget((a) => a.profile)!;
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();

  const serverFilters = {
    artist: selectedArtistIds,
    at: filters.at ?? undefined,
  };

  const { objekts: allOwnedObjekts, hasNextPage } = useOwnedCollections(
    profile.address,
    serverFilters,
  );
  const collectionQuery = useSuspenseQuery(collectionOptions(serverFilters, !hasNextPage));

  const objekts = filterObjekts(filters, allOwnedObjekts);

  const collections = filterObjekts(filters, collectionQuery.data);

  return (
    <div className="flex flex-col gap-4">
      {hasNextPage && (
        <div className="flex items-center gap-2 text-sm font-semibold">
          {content.loading_objekts.value} <Loader variant="ring" className="size-4" />
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
  const content = useIntlayer("stats");
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
        <CardTitle>{content.breakdown_member.title.value}</CardTitle>
        <CardDescription>{content.breakdown_member.description.value}</CardDescription>
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
                          <span className="text-fg">{(payload as any).name}</span>
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
  const content = useIntlayer("stats");
  const { seasons } = useFilterData();

  const chartData = useMemo(() => {
    const data = seasons.map((season) => ({
      name: season,
      fill: getSeasonColor(season),
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
        <CardTitle>{content.breakdown_season.title.value}</CardTitle>
        <CardDescription>{content.breakdown_season.description.value}</CardDescription>
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
                          <span className="text-fg">{(payload as any).name}</span>
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
  const content = useIntlayer("stats");
  const { selectedArtists } = useCosmoArtist();

  const chartData = useMemo(() => {
    const members = selectedArtists
      .flatMap((a) => a.artistMembers)
      .map((a) => ({ color: a.primaryColorHex, name: a.name }));

    const grouped = Object.values(groupBy(objekts, (a) => a.collectionId));

    return members
      .map((member) => {
        const owned = grouped.filter(([objekt]) => {
          return objekt?.member === member.name && tradeableFilter(objekt);
        }).length;
        const total = collections.filter(
          (a) => a.member === member.name && tradeableFilter(a),
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
  }, [selectedArtists, objekts, collections]);

  const chartConfig = {
    percentage: {
      label: content.member_progress.percentage_label.value,
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{content.member_progress.title.value}</CardTitle>
        <CardDescription>{content.member_progress.description.value}</CardDescription>
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
            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={90} />
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
