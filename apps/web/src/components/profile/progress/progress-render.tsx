"use client";

import { type ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type React from "react";
import { Suspense, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Bar, BarChart, Rectangle, XAxis, YAxis } from "recharts";

import { makeObjektRows, ObjektsRenderRow } from "@/components/collection/collection-render";
import ErrorFallbackRender from "@/components/error-boundary";
import { ObjektHoverMenu } from "@/components/objekt/objekt-action";
import { AddToListMenu, ObjektStaticMenu } from "@/components/objekt/objekt-menu";
import ObjektModal from "@/components/objekt/objekt-modal";
import ObjektView from "@/components/objekt/objekt-view";
import { Chart, type ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Loader } from "@/components/ui/loader";
import { ProgressBar, ProgressBarTrack, ProgressBarValue } from "@/components/ui/progress-bar";
import { useConfigStore } from "@/hooks/use-config";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useProgressObjekts } from "@/hooks/use-progress-objekt";
import { useSession } from "@/hooks/use-user";
import { unobtainables } from "@/lib/unobtainables";
import { tradeableFilter } from "@/lib/utils";
import { cn } from "@/utils/classes";

import { useShowCount } from "./filter-showcount";
import ProgressFilter from "./progress-filter";

export default dynamic(() => Promise.resolve(ProgressRender), {
  ssr: false,
});

function ProgressRender() {
  return (
    <ObjektColumnProvider>
      <ObjektModalProvider initialTab="owned">
        <div className="flex flex-col gap-4">
          <ProgressFilter />
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
                  <Progress />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </div>
      </ObjektModalProvider>
    </ObjektColumnProvider>
  );
}

function Progress() {
  const t = useTranslations("progress");
  const { columns } = useObjektColumn();
  const { shaped, filters, ownedSlugs, hasNextPage, stats, ownedFiltered, collectionsFiltered } =
    useProgressObjekts();

  return (
    <>
      {!filters.artist && !filters.member ? (
        <MemberProgressChart objekts={ownedFiltered} collections={collectionsFiltered} />
      ) : (
        <div className="flex flex-col gap-8">
          {hasNextPage && (
            <div className="flex items-center gap-2 text-xs font-semibold">
              {t("loading_objekts")} <Loader variant="ring" className="size-4" />
            </div>
          )}

          <div className="text-sm font-semibold">
            {stats.owned}/{stats.total} ({stats.percentage}%)
          </div>

          <div className="flex flex-col gap-8">
            {shaped.map(([key, grouped]) => (
              <ProgressGroup
                key={key}
                title={key}
                grouped={grouped}
                ownedSlugs={ownedSlugs}
                columns={columns}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

type ProgressGroupProps = {
  title: string;
  grouped: ValidObjekt[][];
  ownedSlugs: Set<string>;
  columns: number;
};

function ProgressGroup(props: ProgressGroupProps) {
  const { percentage, owned, filtered } = useMemo(() => {
    const filtered = props.grouped
      .map(([objekt]) => objekt)
      .filter((a): a is ValidObjekt => a !== undefined && !unobtainables.includes(a.slug));

    const owned = filtered.filter((a) => props.ownedSlugs.has(a.slug));

    const percentage =
      filtered.length > 0 ? Number(((owned.length / filtered.length) * 100).toFixed(1)) : 0;

    return { percentage, owned, filtered };
  }, [props.grouped, props.ownedSlugs]);

  return <ProgressCollapse {...props} percentage={percentage} owned={owned} filtered={filtered} />;
}

interface ProgressCollapseProps extends ProgressGroupProps {
  percentage: number;
  owned: ValidObjekt[];
  filtered: ValidObjekt[];
}

function ProgressCollapse(props: ProgressCollapseProps) {
  const t = useTranslations("progress");
  const { data: session } = useSession();
  const { title, columns, grouped, percentage, ownedSlugs, owned, filtered } = props;
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const [showCount] = useShowCount();
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col">
      <div
        role="none"
        className={cn(
          "flex cursor-pointer select-none flex-wrap items-center gap-4 rounded-lg bg-muted/20 p-4 border transition hover:bg-muted",
          percentage >= 100 && "border-accent-solid shadow-lg shadow-accent-solid/20",
        )}
        onClick={() => setShow(!show)}
      >
        <div className="inline-flex min-w-72 items-center gap-2 text-base font-semibold">
          {title}
        </div>
        <ProgressBar
          aria-label={t("progress_bar_label")}
          className="flex w-fit min-w-[240px] items-center gap-2"
          valueLabel={`${owned.length}/${filtered.length} (${percentage}%)`}
          value={percentage}
        >
          <div className="relative">
            <ProgressBarTrack className="h-2 min-w-32 [--progress-content-bg:var(--color-accent-solid)]" />
          </div>
          <ProgressBarValue className="text-muted-fg flex-none text-sm tabular-nums" />
        </ProgressBar>
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="mt-4 flex flex-col"
          >
            {makeObjektRows({
              items: grouped,
              columns,
              renderItem: ({ items, rowIndex }) => (
                <ObjektsRenderRow
                  key={`${title}-${rowIndex}`}
                  columns={columns}
                  rowIndex={rowIndex}
                  items={items}
                >
                  {({ item: objekts }) => {
                    const [objekt] = objekts as [ValidObjekt];
                    return (
                      <ObjektModal
                        key={objekt.id}
                        objekts={objekts}
                        showOwned
                        menu={
                          session && (
                            <ObjektStaticMenu>
                              <AddToListMenu objekt={objekt} />
                            </ObjektStaticMenu>
                          )
                        }
                      >
                        <ObjektView
                          objekts={objekts}
                          isFade={!ownedSlugs.has(objekt.slug)}
                          unobtainable={unobtainables.includes(objekt.slug)}
                          showCount={showCount}
                          hideLabel={hideLabel}
                        >
                          {session && (
                            <div className="flex items-start self-start justify-self-end">
                              <ObjektHoverMenu>
                                <AddToListMenu objekt={objekt} />
                              </ObjektHoverMenu>
                            </div>
                          )}
                        </ObjektView>
                      </ObjektModal>
                    );
                  }}
                </ObjektsRenderRow>
              ),
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MemberProgressChart({
  objekts,
  collections,
}: {
  objekts: ValidObjekt[];
  collections: ValidObjekt[];
}) {
  const t = useTranslations("stats.member_progress");
  const { selectedArtists } = useCosmoArtist();
  const [_, setFilters] = useFilters();

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
      label: t("percentage_label"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
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
          className="cursor-pointer"
          shape={(props: any) => (
            <>
              <Rectangle
                {...props}
                onClick={() => {
                  return setFilters({
                    member: [props.name],
                  });
                }}
              />
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
                  <div className={cn("flex flex-1 justify-between leading-none", "items-center")}>
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
  );
}
