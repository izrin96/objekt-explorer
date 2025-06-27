"use client";

import {
  Pie,
  PieChart,
  Bar,
  BarChart,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  Chart,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  Loader,
} from "@/components/ui";
import React, { Suspense, useMemo } from "react";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ownedCollectionOptions, collectionOptions } from "@/lib/query-options";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "@/components/error-boundary";
import { useProfile } from "@/hooks/use-profile";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { filterObjekts } from "@/lib/filter-utils";
import { useFilters } from "@/hooks/use-filters";
import { ValidObjekt, unobtainables } from "@/lib/universal/objekts";
import StatsFilter from "./stats-filter";
import { seasonColors, validSeasons } from "@/lib/universal/cosmo/common";
import { groupBy } from "es-toolkit";
import { cn } from "@/utils/classes";
import dynamic from "next/dynamic";

export const ProfileStatsRenderDynamic = dynamic(
  () => Promise.resolve(ProfileStatsRender),
  {
    ssr: false,
  }
);

function ProfileStatsRender() {
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
  const profile = useProfile((a) => a.profile);
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();

  const query = useSuspenseQuery(ownedCollectionOptions(profile!.address));
  const collectionQuery = useSuspenseQuery(collectionOptions);

  const objekts = useMemo(
    () => filterObjekts(filters, query.data),
    [filters, query.data]
  );

  return (
    <div className="flex flex-col gap-4">
      <StatsFilter artists={artists} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BreakdownByMemberChart objekts={objekts} />
        <BreakdownBySeasonChart objekts={objekts} />
        <MemberProgressChart
          objekts={objekts}
          collections={collectionQuery.data}
        />
      </div>
    </div>
  );
}

function BreakdownByMemberChart({ objekts }: { objekts: ValidObjekt[] }) {
  const { artists } = useCosmoArtist();

  const chartData = useMemo(() => {
    const members = artists
      .flatMap((a) => a.artistMembers)
      .map((a) => ({ color: a.primaryColorHex, name: a.name }));

    return members
      .map((a) => ({
        name: a.name,
        fill: a.color,
        count: objekts.filter((obj) => obj.member === a.name).length,
      }))
      .toSorted((a, b) => b.count - a.count);
  }, [artists, objekts]);

  return (
    <Card>
      <Card.Header className="items-center pb-0">
        <Card.Title>Objekt Breakdown By Member</Card.Title>
        <Card.Description>Total objekt by member</Card.Description>
      </Card.Header>
      <Card.Content className="flex-1 pb-0">
        <Chart
          layout="radial"
          data={chartData}
          dataKey="count"
          config={{} satisfies ChartConfig}
          className="mx-auto aspect-square max-h-[450px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelSeparator={false}
                  accessibilityLayer
                  hideLabel
                />
              }
            />
            <Pie
              startAngle={90}
              endAngle={-270}
              data={chartData}
              dataKey="count"
              nameKey="name"
            />
          </PieChart>
        </Chart>
      </Card.Content>
    </Card>
  );
}

function BreakdownBySeasonChart({ objekts }: { objekts: ValidObjekt[] }) {
  const chartData = useMemo(() => {
    return validSeasons
      .map((season, i) => ({
        name: season,
        fill: seasonColors[i],
        count: objekts.filter((obj) => obj.season === season).length,
      }))
      .toSorted((a, b) => b.count - a.count);
  }, [objekts]);

  return (
    <Card>
      <Card.Header className="items-center pb-0">
        <Card.Title>Objekt Breakdown By Season</Card.Title>
        <Card.Description>Total objekt by season</Card.Description>
      </Card.Header>
      <Card.Content className="flex-1 pb-0">
        <Chart
          layout="radial"
          data={chartData}
          dataKey="count"
          config={{} satisfies ChartConfig}
          className="mx-auto aspect-square max-h-[450px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelSeparator={false}
                  accessibilityLayer
                  hideLabel
                />
              }
            />
            <Pie
              startAngle={90}
              endAngle={-270}
              data={chartData}
              dataKey="count"
              nameKey="name"
            />
          </PieChart>
        </Chart>
      </Card.Content>
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
  const { artists } = useCosmoArtist();

  const chartData = useMemo(() => {
    const members = artists
      .flatMap((a) => a.artistMembers)
      .map((a) => ({ color: a.primaryColorHex, name: a.name }));

    const grouped = Object.values(
      groupBy(objekts, (a: ValidObjekt) => a.collectionId)
    );

    const filteredObjekts = filterObjekts(filters, collections);

    return members
      .map((member) => {
        const owned = grouped.filter((group: ValidObjekt[]) => {
          const [objekt] = group;
          return (
            objekt.member === member.name &&
            !unobtainables.includes(objekt.slug) &&
            !["Welcome", "Zero"].includes(objekt.class)
          );
        }).length;
        const total = filteredObjekts.filter(
          (a: ValidObjekt) =>
            a.member === member.name &&
            !unobtainables.includes(a.slug) &&
            !["Welcome", "Zero"].includes(a.class)
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
  }, [artists, objekts, collections, filters]);

  const chartConfig = {
    percentage: {
      label: "Percentage",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Member Progress</Card.Title>
        <Card.Description>Progress by member</Card.Description>
      </Card.Header>
      <Card.Content>
        <Chart
          layout="vertical"
          data={chartData}
          dataKey="percentage"
          config={chartConfig}
          className="h-[1300px] w-full"
        >
          <BarChart accessibilityLayer data={chartData} layout="vertical">
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
            />
            <XAxis dataKey="percentage" type="number" hide domain={[0, 100]} />
            <Bar
              dataKey="percentage"
              radius={5}
              shape={(props: any) => (
                <>
                  <Rectangle {...props} />
                  {/* <text x={props.x + 10} y={props.y + 20} fill="var(--fg)">
                    {props.name}
                  </text> */}
                  <text
                    x={props.background.width + props.x - 20}
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
                  formatter={(value, name, item, index, payload) => (
                    <>
                      <div
                        className={cn(
                          "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                          "w-1"
                        )}
                        style={
                          {
                            "--color-bg": (payload as any).fill,
                            "--color-border": (payload as any).fill,
                          } as React.CSSProperties
                        }
                      />
                      <div
                        className={cn(
                          "flex flex-1 justify-between leading-none",
                          "items-center"
                        )}
                      >
                        <div className="grid gap-1.5">
                          {(payload as any).name}
                          <span className="text-fg">
                            {(payload as any).count}/{(payload as any).total}
                          </span>
                        </div>
                        <span className="font-medium font-mono text-fg tabular-nums">
                          {value.toLocaleString()}%
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
          </BarChart>
        </Chart>
      </Card.Content>
    </Card>
  );
}
