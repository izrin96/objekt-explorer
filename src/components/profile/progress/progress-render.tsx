"use client";

import { QueryErrorResetBoundary, useSuspenseQueries } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { memo, Suspense, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { makeObjektRows, ObjektsRenderRow } from "@/components/collection/collection-render";
import ErrorFallbackRender from "@/components/error-boundary";
import { ObjektHoverMenu } from "@/components/objekt/objekt-action";
import { AddToListMenu, ObjektStaticMenu } from "@/components/objekt/objekt-menu";
import ObjektModal from "@/components/objekt/objekt-modal";
import ObjektView from "@/components/objekt/objekt-view";
import { Loader, ProgressBar } from "@/components/ui";
import { useConfigStore } from "@/hooks/use-config";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useShapeProgress } from "@/hooks/use-shape-progress";
import { useTarget } from "@/hooks/use-target";
import { useUser } from "@/hooks/use-user";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import { unobtainables, type ValidObjekt } from "@/lib/universal/objekts";
import { cn } from "@/utils/classes";
import { useShowCount } from "./filter-showcount";
import ProgressFilter from "./progress-filter";

export const ProgressRenderDynamic = dynamic(() => Promise.resolve(ProgressRender), {
  ssr: false,
});

export default function ProgressRender() {
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
  const { selectedArtistIds } = useCosmoArtist();
  const { columns } = useObjektColumn();
  const profile = useTarget((a) => a.profile)!;
  const [filters] = useFilters();
  const shape = useShapeProgress();

  const [objektsQuery, ownedQuery] = useSuspenseQueries({
    queries: [
      collectionOptions(selectedArtistIds),
      ownedCollectionOptions(profile.address, selectedArtistIds),
    ],
  });

  const { ownedSlugs, shaped } = useMemo(() => {
    const ownedSlugs = new Set(ownedQuery.data.map((obj) => obj.slug));
    const missingObjekts = objektsQuery.data.filter((obj) => !ownedSlugs.has(obj.slug));
    const joinedObjekts = [...ownedQuery.data, ...missingObjekts];
    const shaped = shape(joinedObjekts);
    return { ownedSlugs, shaped };
  }, [shape, ownedQuery.data, objektsQuery.data]);

  return (
    <div className="flex flex-col gap-8">
      <ProgressFilter />
      {!filters.artist && !filters.member ? (
        <div className="flex justify-center text-muted-fg text-sm">
          Select at least 1 artist or 1 member
        </div>
      ) : (
        shaped.map(([key, objekts]) => (
          <ProgressCollapse
            key={key}
            title={key}
            objekts={objekts}
            ownedSlugs={ownedSlugs}
            authenticated={authenticated}
            columns={columns}
          />
        ))
      )}
    </div>
  );
}

const ProgressCollapse = memo(function ProgressCollapse({
  title,
  objekts,
  ownedSlugs,
  authenticated,
  columns,
}: {
  title: string;
  objekts: ValidObjekt[];
  ownedSlugs: Set<string>;
  authenticated: boolean;
  columns: number;
}) {
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const [show, setShow] = useState(false);
  const [showCount] = useShowCount();

  const { filteredObjekts, owned } = useMemo(() => {
    const groupObjekts = Object.values(groupBy(objekts, (a) => a.collectionId));
    const filtered = groupObjekts
      .map(([objekt]) => objekt)
      .filter((a) => unobtainables.includes(a.slug) === false);
    const owned = filtered.filter((a) => ownedSlugs.has(a.slug));
    return { filteredObjekts: filtered, owned };
  }, [objekts, ownedSlugs]);

  const percentage =
    filteredObjekts.length > 0
      ? Number(((owned.length / filteredObjekts.length) * 100).toFixed(1))
      : 0;

  return (
    <div className="flex flex-col">
      <div
        role="none"
        className={cn(
          "inset-ring inset-ring-fg/10 flex cursor-pointer select-none flex-wrap items-center gap-4 rounded-lg bg-secondary/30 p-4 py-4 transition hover:bg-secondary/60",
          percentage >= 100 && "inset-ring-primary",
        )}
        onClick={() => setShow(!show)}
      >
        <div className="inline-flex min-w-72 items-center gap-2 font-semibold text-base">
          {title}
        </div>
        <ProgressBar
          aria-label="Progress Bar"
          className="min-w-[240px]"
          valueLabel={`${owned.length}/${filteredObjekts.length} (${percentage}%)`}
          value={percentage}
        />
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
              items: Object.values(groupBy(objekts, (a) => a.collectionId)),
              columns,
              renderItem: ({ items, rowIndex }) => (
                <ObjektsRenderRow
                  key={`${title}-${rowIndex}`}
                  columns={columns}
                  rowIndex={rowIndex}
                  items={items}
                >
                  {({ item: objekts }) => {
                    const [objekt] = objekts;
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
                        {({ openObjekts }) => (
                          <ObjektView
                            objekts={objekts}
                            isFade={!ownedSlugs.has(objekt.slug)}
                            unobtainable={unobtainables.includes(objekt.slug)}
                            showCount={showCount}
                            hideLabel={hideLabel}
                            open={openObjekts}
                          >
                            {authenticated && (
                              <div className="absolute top-0 right-0 flex">
                                <ObjektHoverMenu>
                                  <AddToListMenu objekt={objekt} />
                                </ObjektHoverMenu>
                              </div>
                            )}
                          </ObjektView>
                        )}
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
});
