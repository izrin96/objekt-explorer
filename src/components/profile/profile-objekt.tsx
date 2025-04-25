"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import FilterView from "../filters/filter-render";
import { useFilters } from "@/hooks/use-filters";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import { shapeProfileObjekts } from "@/lib/filter-utils";
import { Loader } from "../ui";
import { WindowVirtualizer } from "virtua";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-fallback";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ValidObjekt } from "@/lib/universal/objekts";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useProfile } from "@/hooks/use-profile";
import { useBreakpointColumn } from "@/hooks/use-breakpoint-column";
import { GroupLabelRender } from "../collection/label-render";
import {
  ObjektsRender,
  ObjektsRenderRow,
} from "../collection/collection-render";
import ObjektView from "../objekt/objekt-view";

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
    return deferredObjektsFiltered.flatMap(([title, groupedObjekts]) => [
      <GroupLabelRender title={title} key={`label-${title}`} />,
      ...ObjektsRender({
        objekts: groupedObjekts,
        columns,
        children: ({ objekts, rowIndex }) => (
          <ObjektsRenderRow
            key={`${title}-${rowIndex}`}
            columns={columns}
            rowIndex={rowIndex}
            objekts={objekts}
          >
            {({ objekts, index }) => {
              const [objekt] = objekts;
              return (
                <ObjektView
                  key={objekt.id}
                  objekts={objekts}
                  isFade={!("serial" in objekt)}
                  priority={index < columns * 3}
                  showSerial={!filters.grouped}
                  showCount
                />
              );
            }}
          </ObjektsRenderRow>
        ),
      }),
    ]);
  }, [deferredObjektsFiltered, filters.grouped, columns]);

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
    <div className="flex flex-col gap-2">
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
