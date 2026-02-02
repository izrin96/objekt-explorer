"use client";

import { type ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { makeObjektRows, ObjektsRenderRow } from "@/components/collection/collection-render";
import ErrorFallbackRender from "@/components/error-boundary";
import { ObjektHoverMenu } from "@/components/objekt/objekt-action";
import { AddToListMenu, ObjektStaticMenu } from "@/components/objekt/objekt-menu";
import ObjektModal from "@/components/objekt/objekt-modal";
import ObjektView from "@/components/objekt/objekt-view";
import { Loader } from "@/components/ui/loader";
import { ProgressBar, ProgressBarTrack, ProgressBarValue } from "@/components/ui/progress-bar";
import { useConfigStore } from "@/hooks/use-config";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useProgressObjekts } from "@/hooks/use-progress-objekt";
import { useUser } from "@/hooks/use-user";
import { unobtainables } from "@/lib/unobtainables";
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
      </ObjektModalProvider>
    </ObjektColumnProvider>
  );
}

function Progress() {
  const { authenticated } = useUser();
  const { columns } = useObjektColumn();
  const { shaped, filters, ownedSlugs, hasNextPage } = useProgressObjekts();

  return (
    <div className="flex flex-col gap-8">
      <ProgressFilter />

      {!filters.artist && !filters.member ? (
        <div className="text-muted-fg flex justify-center text-sm">
          Select at least 1 artist or 1 member
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {hasNextPage && (
            <div className="flex items-center gap-2 text-xs font-semibold">
              Loading objekts <Loader variant="ring" className="size-4" />
            </div>
          )}

          {shaped.map(([key, grouped]) => (
            <ProgressGroup
              key={key}
              title={key}
              grouped={grouped}
              ownedSlugs={ownedSlugs}
              authenticated={authenticated}
              columns={columns}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type ProgressGroupProps = {
  title: string;
  grouped: ValidObjekt[][];
  ownedSlugs: Set<string>;
  authenticated: boolean;
  columns: number;
};

function ProgressGroup(props: ProgressGroupProps) {
  const filtered = props.grouped
    .map(([objekt]) => objekt)
    .filter((a): a is ValidObjekt => a !== undefined && !unobtainables.includes(a.slug));

  const owned = filtered.filter((a) => props.ownedSlugs.has(a.slug));

  const percentage =
    filtered.length > 0 ? Number(((owned.length / filtered.length) * 100).toFixed(1)) : 0;

  const collapseProps = {
    ...props,
    percentage,
    owned,
    filtered,
  };

  return <ProgressCollapse {...collapseProps} />;
}

interface ProgressCollapseProps extends ProgressGroupProps {
  percentage: number;
  owned: ValidObjekt[];
  filtered: ValidObjekt[];
}

function ProgressCollapse(props: ProgressCollapseProps) {
  const { title, columns, grouped, percentage, ownedSlugs, owned, filtered, authenticated } = props;
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const [showCount] = useShowCount();
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col">
      <div
        role="none"
        className={cn(
          "flex cursor-pointer select-none flex-wrap items-center gap-4 rounded-lg bg-overlay p-4 py-4 ring-1 ring-fg/10 transition hover:bg-muted",
          percentage >= 100 && "ring-primary",
        )}
        onClick={() => setShow(!show)}
      >
        <div className="inline-flex min-w-72 items-center gap-2 text-base font-semibold">
          {title}
        </div>
        <ProgressBar
          aria-label="Progress Bar"
          className="flex w-fit min-w-[240px] items-center gap-2"
          valueLabel={`${owned.length}/${filtered.length} (${percentage}%)`}
          value={percentage}
        >
          <div className="relative">
            <ProgressBarTrack className="h-2 min-w-32" />
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
                          authenticated && (
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
                          {authenticated && (
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
