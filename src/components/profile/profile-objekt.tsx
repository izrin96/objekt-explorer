"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFilters } from "@/hooks/use-filters";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import { ObjektItem, shapeObjekts } from "@/lib/filter-utils";
import { Loader } from "../ui";
import { WindowVirtualizer } from "virtua";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ValidObjekt } from "@/lib/universal/objekts";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useProfile, useProfileAuthed } from "@/hooks/use-profile";
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
import Filter from "./filter";
import { api } from "@/lib/trpc/client";
import { ObjektOverlay } from "../objekt/objekt-action";

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
  const isProfileAuthed = useProfileAuthed();
  const profile = useProfile((a) => a.profile);
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const { columns } = useBreakpointColumn();
  const [count, setCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);

  const [objektsFiltered, setObjektsFiltered] = useState<
    [string, ObjektItem<ValidObjekt[]>[]][]
  >([]);
  const deferredObjektsFiltered = useDeferredValue(objektsFiltered);

  const objektsQuery = useQuery(collectionOptions);
  const ownedQuery = useQuery(ownedCollectionOptions(profile!.address));
  // todo: store state into context
  const pinsQuery = api.pins.get.useQuery(profile!.address, {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

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
    return deferredObjektsFiltered.flatMap(([title, items]) => [
      !!title && <GroupLabelRender title={title} key={`label-${title}`} />,
      ...ObjektsRender({
        items,
        columns,
        children: ({ items, rowIndex }) => (
          <ObjektsRenderRow
            key={`${title}-${rowIndex}`}
            columns={columns}
            rowIndex={rowIndex}
            items={items}
          >
            {({ item, index }) => {
              const [objekt] = item.item;
              return (
                <ObjektModalProvider
                  key={objekt.id}
                  objekts={item.item}
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
                          objekts={item.item}
                          priority={index < columns * 3}
                          isSelected={isSelected}
                          open={open}
                          select={select}
                          // for profile
                          showCount
                          showSerial={!filters.grouped}
                          isFade={!("serial" in objekt)}
                        >
                          <ObjektOverlay
                            isPin={item.type === "pin"}
                            profile={profile!}
                            tokenId={objekt.id}
                            isOwned={isProfileAuthed}
                          />
                        </ObjektView>
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
  }, [
    deferredObjektsFiltered,
    filters.grouped,
    columns,
    session,
    isProfileAuthed,
    profile,
  ]);

  useEffect(() => {
    const shaped = shapeObjekts(
      filters,
      joinedObjekts,
      artists,
      pinsQuery.data
    );
    const allGroupedObjekts = shaped.flatMap(([, objekts]) => objekts);
    const allObjekts = allGroupedObjekts.flatMap((item) => item.item);
    setGroupCount(allGroupedObjekts.length);
    setCount(allObjekts.length);
    setObjektsFiltered(shaped);
  }, [filters, joinedObjekts, artists, pinsQuery.data]);

  if (objektsQuery.isLoading || ownedQuery.isLoading)
    return (
      <div className="justify-center flex">
        <Loader variant="ring" />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <Filter />
        {session && <SelectMode state="add" />}
      </div>
      <span className="font-semibold">
        {count} total
        {filters.grouped ? ` (${groupCount} types)` : undefined}
      </span>

      <WindowVirtualizer>{virtualList}</WindowVirtualizer>
    </div>
  );
}
