"use client";

import ObjektView from "@/components/objekt/objekt-view";
import { checkFiltering, useFilters } from "@/hooks/use-filters";
import { shapeProgressCollections } from "@/lib/filter-utils";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react";
import ProgressFilter from "./progress-filter";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "@/components/error-boundary";
import { Loader, ProgressBar } from "@/components/ui";
import { unobtainables, ValidObjekt } from "@/lib/universal/objekts";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useProfile } from "@/hooks/use-profile";
import { groupBy } from "es-toolkit";
import { cn } from "@/utils/classes";
import { useShowCount } from "./filter-showcount";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import ObjektModal from "@/components/objekt/objekt-modal";
import {
  AddToListMenu,
  ObjektStaticMenu,
} from "@/components/objekt/objekt-menu";
import { ObjektHoverMenu } from "@/components/objekt/objekt-action";
import { useUser } from "@/hooks/use-user";
import { motion, AnimatePresence } from "motion/react";

export default function ProgressRender() {
  return (
    <ObjektModalProvider initialTab="owned">
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            FallbackComponent={ErrorFallbackRender}
          >
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
  const { artists } = useCosmoArtist();
  const profile = useProfile((a) => a.profile);
  const [filters, setFilters] = useFilters();
  const first = useRef(false);

  const objektsQuery = useSuspenseQuery(collectionOptions);
  const ownedQuery = useSuspenseQuery(ownedCollectionOptions(profile!.address));

  const { ownedSlugs, shaped } = useMemo(() => {
    const ownedSlugs = new Set(ownedQuery.data.map((obj) => obj.slug));
    const missingObjekts = objektsQuery.data.filter(
      (obj) => !ownedSlugs.has(obj.slug)
    );
    const joinedObjekts = [...ownedQuery.data, ...missingObjekts];
    const shaped = shapeProgressCollections(artists, filters, joinedObjekts);
    return { ownedSlugs, shaped };
  }, [ownedQuery.data, objektsQuery.data, artists, filters]);

  const calculateMemberRanks = useCallback(() => {
    const members = artists.flatMap((a) => a.artistMembers).map((a) => a.name);
    const grouped = Object.values(
      groupBy(ownedQuery.data, (a) => a.collectionId)
    );

    return members
      .map((member) => ({
        name: member,
        owned: grouped.filter(([objekt]) => objekt.member === member).length,
        total: objektsQuery.data.filter((a) => a.member === member).length,
      }))
      .map((a) => ({
        name: a.name,
        progress: (a.owned / a.total) * 100,
      }))
      .toSorted((a, b) => b.progress - a.progress);
  }, [artists, ownedQuery.data, objektsQuery.data]);

  useEffect(() => {
    if (first.current || ownedQuery.isLoading || objektsQuery.isLoading) return;
    first.current = true;

    const isFiltering = checkFiltering(filters);
    if (isFiltering) return;

    const ranks = calculateMemberRanks();
    if (ranks.length) {
      const { name } = ranks[0];
      setFilters({
        member: [name],
      });
    }
  }, [
    ownedQuery.data,
    calculateMemberRanks,
    filters,
    setFilters,
    ownedQuery.isLoading,
    objektsQuery.isLoading,
  ]);

  return (
    <div className="flex flex-col gap-8">
      <ProgressFilter artists={artists} />
      {!filters.artist && !filters.member ? (
        <div className="flex justify-center text-sm text-muted-fg">
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
      .filter((a) => !unobtainables.includes(a.slug));
    const owned = filtered.filter((a) => ownedSlugs.has(a.slug));
    return { filteredObjekts: filtered, owned };
  }, [objekts, ownedSlugs]);

  const percentage =
    filteredObjekts.length === 0
      ? 100
      : Math.floor((owned.length / filteredObjekts.length) * 100);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex gap-4 py-4 flex-wrap cursor-pointer select-none items-center transition rounded-lg p-4 inset-ring inset-ring-fg/10 bg-secondary/30 hover:bg-secondary/60",
          percentage >= 100 && "inset-ring-primary"
        )}
        onClick={() => setShow(!show)}
      >
        <div className="font-semibold text-base inline-flex gap-2 items-center min-w-72">
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
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 lg:gap-3 mt-4">
              {Object.values(groupBy(objekts, (a) => a.collectionId)).map(
                (objekts) => {
                  const [objekt] = objekts;
                  return (
                    <ObjektModal
                      key={objekt.id}
                      objekts={objekts}
                      isProfile
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
                }
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
