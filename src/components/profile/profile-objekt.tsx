"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import FilterView from "../filters/filter-render";
import { useFilters } from "@/hooks/use-filters";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import { shapeProfileObjekts } from "@/lib/filter-utils";
import { Loader } from "../ui";
import { WindowVirtualizer } from "virtua";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
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
import { ObjektTabProvider } from "@/hooks/use-objekt-tab";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { SelectMode } from "../filters/select-mode";
import { authClient } from "@/lib/auth-client";

export default function ProfileObjektRender() {
  return (
    <ObjektSelectProvider>
      <ObjektTabProvider initialTab="owned">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              FallbackComponent={ErrorFallbackRender}
            >
              <ProfileObjekt />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektTabProvider>
    </ObjektSelectProvider>
  );
}

function ProfileObjekt() {
  const { data: session } = authClient.useSession();
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
      !!title && <GroupLabelRender title={title} key={`label-${title}`} />,
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
                <ObjektModalProvider
                  key={objekt.id}
                  objekts={objekts}
                  isProfile
                >
                  {({ openObjekts }) => (
                    <ObjektViewSelectable
                      getId={() => objekt.slug}
                      openObjekts={openObjekts}
                      enableSelect={!!session}
                    >
                      {({ isSelected, open, select }) => (
                        <ObjektView
                          objekts={objekts}
                          priority={index < columns * 3}
                          isSelected={isSelected}
                          open={open}
                          select={select}
                          // for profile
                          showCount
                          showSerial={!filters.grouped}
                          isFade={!("serial" in objekt)}
                        />
                      )}
                    </ObjektViewSelectable>
                  )}
                </ObjektModalProvider>
              );
            }}
          </ObjektsRenderRow>
        ),
      }),
    ]);
  }, [deferredObjektsFiltered, filters.grouped, columns, session]);

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <FilterView isProfile artists={artists} />
        {session && <SelectMode state="add" />}
      </div>
      <span className="font-semibold">
        {count} total
        {filters.grouped ? ` (${groupedCount} types)` : undefined}
      </span>

      <WindowVirtualizer>{virtualList}</WindowVirtualizer>
    </div>
  );
}
