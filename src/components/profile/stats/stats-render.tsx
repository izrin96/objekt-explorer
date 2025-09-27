"use client";

import { QueryErrorResetBoundary, useSuspenseQueries } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import dynamic from "next/dynamic";
import type React from "react";
import { type CSSProperties, Suspense, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Bar, BarChart, Pie, PieChart, Rectangle, XAxis, YAxis } from "recharts";
import ErrorFallbackRender from "@/components/error-boundary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Chart,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  Loader,
} from "@/components/ui";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { useObjektFilter } from "@/hooks/use-objekt-filter";
import { useTarget } from "@/hooks/use-target";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import { seasonColors, validSeasons } from "@/lib/universal/cosmo/common";
import { unobtainables, type ValidObjekt } from "@/lib/universal/objekts";
import { cn } from "@/utils/classes";
import StatsFilter from "./stats-filter";

export const ProfileStatsRenderDynamic = dynamic(() => Promise.resolve(ProfileStatsRender), {
  ssr: false,
});

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

  const [query, collectionQuery] = useSuspenseQueries({
    queries: [
      ownedCollectionOptions(profile.address, selectedArtistIds),
      collectionOptions(selectedArtistIds),
    ],
  });

  const objekts = useMemo(() => filter(query.data), [filter, query.data]);

  const collections = useMemo(() => filter(collectionQuery.data), [filter, collectionQuery.data]);

  return (
    <div className="flex flex-col gap-4">
      <StatsFilter />
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
      .map((d) => ({
        ...d,
        percentage: total > 0 ? Number(((d.count / total) * 100).toFixed(1)) : 0,
      }))
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
          className="aspect-square h-full max-h-[450px] w-full"
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
                        <span className="font-medium text-fg tabular-nums">
                          {(payload as any).percentage}% ({value.toLocaleString()})
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
  const chartData = useMemo(() => {
    const data = validSeasons.map((season, i) => ({
      name: season,
      fill: seasonColors[i],
      count: objekts.filter((obj) => obj.season === season).length,
    }));
    const total = data.reduce((sum, d) => sum + d.count, 0);
    return data
      .map((d) => ({
        ...d,
        percentage: total > 0 ? Number(((d.count / total) * 100).toFixed(1)) : 0,
      }))
      .toSorted((a, b) => b.count - a.count);
  }, [objekts]);

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
          className="aspect-square h-full max-h-[450px] w-full"
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
                        <span className="font-medium text-fg tabular-nums">
                          {(payload as any).percentage}% ({value.toLocaleString()})
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

    const grouped = Object.values(groupBy(objekts, (a: ValidObjekt) => a.collectionId));

    return members
      .map((member) => {
        const owned = grouped.filter((group: ValidObjekt[]) => {
          const [objekt] = group;
          return (
            objekt.member === member.name &&
            unobtainables.includes(objekt.slug) === false &&
            ["Welcome", "Zero"].includes(objekt.class) === false
          );
        }).length;
        const total = collections.filter(
          (a: ValidObjekt) =>
            a.member === member.name &&
            unobtainables.includes(a.slug) === false &&
            ["Welcome", "Zero"].includes(a.class) === false,
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
          className="h-(--height) w-full"
          style={
            {
              "--height": `${chartData.length * 40}px`,
            } as CSSProperties
          }
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
      </CardContent>
    </Card>
  );
}
