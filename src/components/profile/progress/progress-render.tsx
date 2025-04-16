"use client";

import ObjektView from "@/components/objekt/objekt-view";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { shapeProgressCollections } from "@/lib/filter-utils";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import React, { memo, useEffect, useMemo, useState } from "react";
import ProgressFilter from "./progress-filter";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "@/components/error-fallback";
import { Loader, ProgressBar } from "@/components/ui";
import { IndexedObjekt, unobtainables } from "@/lib/universal/objekts";
import { IconExpand45, IconMinimize45 } from "@intentui/icons";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useProfile } from "@/hooks/use-profile";
import { groupBy } from "es-toolkit";
import { cn } from "@/utils/classes";

export default function ProgressRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <Progress />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function Progress() {
  const { artists } = useCosmoArtist();
  const { profile } = useProfile();
  const [filters, setFilters] = useFilters();

  const objektsQuery = useQuery(collectionOptions);
  const ownedQuery = useQuery(ownedCollectionOptions(profile.address));

  const objekts = useMemo(() => objektsQuery.data ?? [], [objektsQuery.data]);
  const ownedObjekts = useMemo(() => ownedQuery.data ?? [], [ownedQuery.data]);

  const shaped = useMemo(
    () => shapeProgressCollections(artists, filters, objekts),
    [artists, filters, objekts]
  );

  const ownedSlugs = useMemo(
    () => new Set(ownedObjekts.map((obj) => obj.slug)),
    [ownedObjekts]
  );

  useEffect(() => {
    // find member with highest objekt count and auto set filter
    if (!ownedObjekts.length) return;

    const members = artists.flatMap((a) => a.artistMembers).map((a) => a.name);
    const grouped = Object.values(groupBy(ownedObjekts, (a) => a.collectionId));

    const ranks = members
      .map((member) => ({
        name: member,
        owned: grouped.filter(([objekt]) => objekt.member === member).length,
        total: objekts.filter((a) => a.member === member).length,
      }))
      .map((a) => ({
        name: a.name,
        progress: (a.owned / a.total) * 100,
      }))
      .toSorted((a, b) => b.progress - a.progress);

    if (ranks.length) {
      const { name } = ranks[0];
      setFilters({
        member: [name],
      });
    }
  }, [ownedObjekts, objekts, setFilters, artists]);

  if (objektsQuery.isLoading || ownedQuery.isLoading)
    return (
      <div className="justify-center flex">
        <Loader variant="ring" />
      </div>
    );

  return (
    <ObjektModalProvider initialTab="trades">
      <div className="flex flex-col gap-8 mb-8">
        <ProgressFilter artists={artists} />
        {!filters.artist && !filters.member ? (
          <div className="flex justify-center text-sm text-muted-fg">
            Select at least 1 artist or 1 member
          </div>
        ) : (
          shaped.map(([key, objekts]) => {
            return (
              <ProgressCollapse
                key={key}
                title={key}
                objekts={objekts}
                ownedSlugs={ownedSlugs}
              />
            );
          })
        )}
      </div>
    </ObjektModalProvider>
  );
}

const ProgressCollapse = memo(function ProgressCollapse({
  title,
  objekts,
  ownedSlugs,
}: {
  title: string;
  objekts: IndexedObjekt[];
  ownedSlugs: Set<string>;
}) {
  const [show, setShow] = useState(false);

  const filteredObjekts = useMemo(
    () => objekts.filter((a) => !unobtainables.includes(a.slug)),
    [objekts]
  );

  const owned = useMemo(
    () => filteredObjekts.filter((a) => ownedSlugs.has(a.slug)),
    [filteredObjekts, ownedSlugs]
  );

  const percentage = useMemo(() => {
    if (filteredObjekts.length === 0) return 100;
    const percentage = Math.floor(
      (owned.length / filteredObjekts.length) * 100
    );
    return percentage;
  }, [owned, filteredObjekts]);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex gap-4 py-4 flex-wrap cursor-pointer select-none items-center transition rounded-lg p-4 inset-ring inset-ring-fg/10 bg-secondary/30 hover:bg-secondary/60",
          percentage >= 100 && "inset-ring-primary"
        )}
        onClick={() => setShow(!show)}
      >
        <div className="font-semibold text-base inline-flex gap-2 items-center min-w-72">
          {title}
          {show ? <IconMinimize45 /> : <IconExpand45 />}
        </div>
        <ProgressBar
          aria-label="Progress Bar"
          className="min-w-[240px]"
          valueLabel={`${owned.length}/${filteredObjekts.length} (${percentage}%)`}
          value={percentage}
        />
      </div>
      {show && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 lg:gap-3">
          {objekts.map((objekt) => (
            <ObjektView
              key={objekt.slug}
              objekts={[objekt]}
              isFade={!ownedSlugs.has(objekt.slug)}
              unobtainable={unobtainables.includes(objekt.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
