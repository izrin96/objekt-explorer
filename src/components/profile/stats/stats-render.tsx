"use client";

import { Pie, PieChart } from "recharts";
import {
  Card,
  Chart,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  Loader,
} from "@/components/ui";
import React, { useMemo } from "react";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import { ownedCollectionOptions } from "@/lib/query-options";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "@/components/error-boundary";
import { useProfile } from "@/hooks/use-profile";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { filterObjekts } from "@/lib/filter-utils";
import { useFilters } from "@/hooks/use-filters";
import { ValidObjekt } from "@/lib/universal/objekts";
import StatsFilter from "./stats-filter";
import { seasonColors, validSeasons } from "@/lib/universal/cosmo/common";

export default function ProfileStatsRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <ProfileStats />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function ProfileStats() {
  const profile = useProfile((a) => a.profile);
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();

  const { data, isLoading } = useQuery(
    ownedCollectionOptions(profile!.address)
  );

  const objekts = useMemo(
    () => filterObjekts(filters, data ?? []),
    [filters, data]
  );

  if (isLoading)
    return (
      <div className="justify-center flex">
        <Loader variant="ring" />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <StatsFilter artists={artists} />
      <div className="grid md:grid-cols-2 gap-4">
        <BreakdownByMemberChart objekts={objekts} />
        <BreakdownBySeasonChart objekts={objekts} />
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
          config={{} satisfies ChartConfig}
          className="mx-auto aspect-square max-h-[450px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
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
          config={{} satisfies ChartConfig}
          className="mx-auto aspect-square max-h-[450px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
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
