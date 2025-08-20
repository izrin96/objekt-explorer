"use client";

import { QueryErrorResetBoundary, useSuspenseQueries } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { memo, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "@/components/error-boundary";
import { ObjektHoverMenu } from "@/components/objekt/objekt-action";
import { AddToListMenu, ObjektStaticMenu } from "@/components/objekt/objekt-menu";
import ObjektModal from "@/components/objekt/objekt-modal";
import ObjektView from "@/components/objekt/objekt-view";
import { Loader, ProgressBar } from "@/components/ui";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { checkFiltering, useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useTarget } from "@/hooks/use-target";
import { useUser } from "@/hooks/use-user";
import { shapeProgressCollections } from "@/lib/filter-utils";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import { unobtainables, type ValidObjekt } from "@/lib/universal/objekts";
import { cn } from "@/utils/classes";
import { useShowCount } from "./filter-showcount";
import ProgressFilter from "./progress-filter";

export const ProgressRenderDynamic = dynamic(() => Promise.resolve(ProgressRender), {
  ssr: false,
});

function ProgressRender() {
  return (
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
  );
}

function Progress() {
  const { authenticated } = useUser();
  const { artists, selectedArtists, selectedArtistIds, getArtist } = useCosmoArtist();
  const profile = useTarget((a) => a.profile)!;
  const [filters, setFilters] = useFilters();

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
    const shaped = shapeProgressCollections(artists, filters, joinedObjekts, getArtist);
    return { ownedSlugs, shaped };
  }, [ownedQuery.data, objektsQuery.data, artists, filters]);

  const calculateMemberRanks = useCallback(() => {
    const members = selectedArtists.flatMap((a) => a.artistMembers).map((a) => a.name);
    const grouped = Object.values(groupBy(ownedQuery.data, (a) => a.collectionId));

    return members
      .map((member) => ({
        name: member,
        owned: grouped.filter(([objekt]) => objekt.member === member).length,
        total: objektsQuery.data.filter((a) => a.member === member).length,
      }))
      .map((a) => ({
        name: a.name,
        progress: a.total === 0 ? 0 : (a.owned / a.total) * 100,
      }))
      .toSorted((a, b) => b.progress - a.progress);
  }, [selectedArtists, ownedQuery.data, objektsQuery.data]);

  useEffect(() => {
    const isFiltering = checkFiltering(filters);
    if (isFiltering) return;

    const ranks = calculateMemberRanks();
    if (ranks.length) {
      const { name, progress } = ranks[0];
      if (progress > 0) {
        setFilters({
          member: [name],
        });
      }
    }
  }, []);

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
}: {
  title: string;
  objekts: ValidObjekt[];
  ownedSlugs: Set<string>;
  authenticated: boolean;
}) {
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
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 lg:gap-3">
              {Object.values(groupBy(objekts, (a) => a.collectionId)).map((objekts) => {
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
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
