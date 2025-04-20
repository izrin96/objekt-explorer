"use client";

import {
  CSSProperties,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import FilterView from "../filters/filter-render";
import { useFilters } from "@/hooks/use-filters";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import ObjektView from "../objekt/objekt-view";
import { shapeProfileObjekts } from "@/lib/filter-utils";
import { Loader } from "../ui";
import { WindowVirtualizer } from "virtua";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-fallback";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ValidObjekt } from "@/lib/universal/objekts";
import { GroupLabelRender } from "../index/index-view";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useProfile } from "@/hooks/use-profile";
import { useBreakpointColumn } from "@/hooks/use-breakpoint-column";

export default function ProfileObjektRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <ProfileObjekt />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function ProfileObjekt() {
  const { profile } = useProfile();
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const { columns } = useBreakpointColumn();

  const [objektsFiltered, setObjektsFiltered] = useState<
    [string, ValidObjekt[][]][]
  >([]);
  const deferredObjektsFiltered = useDeferredValue(objektsFiltered);

  const objektsQuery = useQuery(collectionOptions);
  const ownedQuery = useQuery(ownedCollectionOptions(profile.address));

  const objekts = useMemo(() => objektsQuery.data ?? [], [objektsQuery.data]);
  const ownedObjekts = useMemo(() => ownedQuery.data ?? [], [ownedQuery.data]);

  const joinedObjekts = useMemo(() => {
    if (filters.unowned) {
      const ownedSlugs = new Set(ownedObjekts.map((obj) => obj.slug));

      const missingObjekts = objekts.filter((obj) => !ownedSlugs.has(obj.slug));

      return [...ownedObjekts, ...missingObjekts];
    }
    return ownedObjekts;
  }, [ownedObjekts, filters.unowned, objekts]);

  const virtualList = useMemo(() => {
    return deferredObjektsFiltered.flatMap(([key, groupedObjekts]) => [
      GroupLabelRender({ key }),
      ...ObjektsRender({ groupedObjekts, columns, key }),
    ]);
  }, [deferredObjektsFiltered, columns]);

  const count = useMemo(
    () =>
      deferredObjektsFiltered
        .flatMap(([, objekts]) => objekts)
        .flatMap((item) => item).length,
    [deferredObjektsFiltered]
  );

  const groupedCount = useMemo(
    () => deferredObjektsFiltered.flatMap(([, objekts]) => objekts).length,
    [deferredObjektsFiltered]
  );

  useEffect(() => {
    setObjektsFiltered(shapeProfileObjekts(filters, joinedObjekts, artists));
  }, [filters, joinedObjekts, artists]);

  if (objektsQuery.isLoading || ownedQuery.isLoading)
    return (
      <div className="justify-center flex">
        <Loader variant="ring" />
      </div>
    );

  return (
    <div className="flex flex-col gap-2 mb-8">
      <FilterView isProfile artists={artists} />
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {count} total
          {filters.grouped ? ` (${groupedCount} types)` : undefined}
        </span>
      </div>

      <ObjektModalProvider initialTab="owned" isProfile>
        <WindowVirtualizer>{virtualList}</WindowVirtualizer>
      </ObjektModalProvider>
    </div>
  );
}

function ObjektsRender({
  key,
  groupedObjekts,
  columns,
}: {
  key: string;
  groupedObjekts: ValidObjekt[][];
  columns: number;
}) {
  return Array.from({
    length: Math.ceil(groupedObjekts.length / columns),
  }).map((_, i) => {
    return (
      <ObjektsRowRender
        key={`${key}_${i}`}
        rowIndex={i}
        columns={columns}
        groupedObjekts={groupedObjekts}
      />
    );
  });
}

function ObjektsRowRender({
  rowIndex,
  groupedObjekts,
  columns,
}: {
  rowIndex: number;
  groupedObjekts: ValidObjekt[][];
  columns: number;
}) {
  const start = rowIndex * columns;
  const end = start + columns;
  return (
    <div
      className="grid grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))] gap-3 lg:gap-4 pb-4"
      style={{ "--grid-columns": columns } as CSSProperties}
    >
      {groupedObjekts.slice(start, end).map((objekts, j) => {
        const index = rowIndex * columns + j;
        const [objekt] = objekts;
        return (
          <ObjektView
            key={objekt.id}
            objekts={objekts}
            isFade={!("serial" in objekt)}
            priority={index < columns * 3}
          />
        );
      })}
    </div>
  );
}
