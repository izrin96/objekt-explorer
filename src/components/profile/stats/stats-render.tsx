"use client";

import { Pie, PieChart } from "recharts";
import {
  Card,
  Chart,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  Loader,
  Note,
} from "@/components/ui";
import React, { useMemo } from "react";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import { ownedCollectionOptions } from "@/lib/query-options";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "@/components/error-fallback";
import { useProfile } from "@/hooks/use-profile";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";

const chartConfig = {} satisfies ChartConfig;

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
  const { profile } = useProfile();
  const { artists } = useCosmoArtist();

  const { data: ownedObjekts, isLoading } = useQuery(
    ownedCollectionOptions(profile.address)
  );

  const chartData = useMemo(() => {
    const members = artists
      .flatMap((a) => a.artistMembers)
      .map((a) => ({ color: a.primaryColorHex, name: a.name }));

    return members
      .map((a) => ({
        name: a.name,
        fill: a.color,
        count: ownedObjekts?.filter((obj) => obj.member === a.name).length ?? 0,
      }))
      .toSorted((a, b) => b.count - a.count);
  }, [artists, ownedObjekts]);

  if (isLoading)
    return (
      <div className="justify-center flex">
        <Loader variant="ring" />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <Note intent="default">This page is in work in-progress.</Note>
      <div className="grid md:grid-cols-2">
        <Card>
          <Card.Header className="items-center pb-0">
            <Card.Title>Objekt Breakdown (by Member)</Card.Title>
            <Card.Description>Total objekt by member</Card.Description>
          </Card.Header>
          <Card.Content className="flex-1 pb-0">
            <Chart
              config={chartConfig}
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
      </div>
    </div>
  );
}
