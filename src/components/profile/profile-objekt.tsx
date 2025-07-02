"use client";

import { QueryErrorResetBoundary, useQuery, useSuspenseQueries } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";
import { useBreakpointColumn } from "@/hooks/use-breakpoint-column";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useProfile } from "@/hooks/use-profile";
import { useProfileAuthed, useUser } from "@/hooks/use-user";
import { type ObjektItem, shapeObjekts } from "@/lib/filter-utils";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
import { api } from "@/lib/trpc/client";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { ObjektsRender, ObjektsRenderRow } from "../collection/collection-render";
import { GroupLabelRender } from "../collection/label-render";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { AddToList } from "../list/modal/manage-objekt";
import {
  ObjektHoverMenu,
  ObjektOverlay,
  ObjektSelect,
  ObjektToggleLock,
  ObjektTogglePin,
} from "../objekt/objekt-action";
import {
  AddToListMenu,
  ObjektStaticMenu,
  SelectMenuItem,
  ToggleLockMenuItem,
  TogglePinMenuItem,
} from "../objekt/objekt-menu";
import ObjektModal from "../objekt/objekt-modal";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import { Loader } from "../ui";
import Filter from "./filter";
import { PinObjekt, UnpinObjekt } from "./form/pin-unpin";

export const ProfileObjektRenderDynamic = dynamic(() => Promise.resolve(ProfileObjektRender), {
  ssr: false,
});

function ProfileObjektRender() {
  return (
    <ObjektSelectProvider>
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
                <ProfileObjekt />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektModalProvider>
    </ObjektSelectProvider>
  );
}

function ProfileObjekt() {
  const { authenticated } = useUser();
  const utils = api.useUtils();
  const isProfileAuthed = useProfileAuthed();
  const profile = useProfile((a) => a.profile);
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const { columns } = useBreakpointColumn();
  const [count, setCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);

  const [objektsFiltered, setObjektsFiltered] = useState<[string, ObjektItem<ValidObjekt[]>[]][]>(
    [],
  );
  const deferredObjektsFiltered = useDeferredValue(objektsFiltered);

  const objektsQuery = useQuery({
    ...collectionOptions,
    enabled: filters.unowned ?? false,
  });

  const [ownedQuery, pinsQuery, lockedObjektQuery] = useSuspenseQueries({
    queries: [
      ownedCollectionOptions(profile!.address),
      utils.pins.get.queryOptions(profile!.address, {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5,
      }),
      utils.lockedObjekt.get.queryOptions(profile!.address, {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5,
      }),
    ],
  });

  const joinedObjekts = useMemo(() => {
    if (filters.unowned) {
      const ownedSlugs = new Set(ownedQuery.data.map((obj) => obj.slug));
      const missingObjekts = (objektsQuery.data ?? []).filter((obj) => !ownedSlugs.has(obj.slug));
      return [...ownedQuery.data, ...missingObjekts];
    }
    return ownedQuery.data;
  }, [ownedQuery.data, filters.unowned, objektsQuery.data]);

  const virtualList = useMemo(() => {
    return deferredObjektsFiltered.flatMap(([title, items]) => [
      ...(title ? [<GroupLabelRender title={title} key={`label-${title}`} />] : []),
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
                <ObjektModal
                  key={objekt.id}
                  objekts={item.item}
                  showOwned
                  menu={
                    authenticated && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        {isProfileAuthed && (
                          <>
                            <TogglePinMenuItem
                              isPin={item.isPin}
                              profile={profile!}
                              tokenId={objekt.id}
                            />
                            <ToggleLockMenuItem
                              isLocked={item.isLocked}
                              profile={profile!}
                              tokenId={objekt.id}
                            />
                          </>
                        )}
                        <AddToListMenu objekt={objekt} />
                      </ObjektStaticMenu>
                    )
                  }
                >
                  {({ openObjekts }) => (
                    <ObjektViewSelectable objekt={objekt} openObjekts={openObjekts}>
                      {({ isSelected, open }) => (
                        <ObjektView
                          objekts={item.item}
                          priority={index < columns * 3}
                          isSelected={isSelected}
                          open={open}
                          // for profile
                          showCount
                          showSerial={!filters.grouped}
                          isFade={!("serial" in objekt)}
                        >
                          {authenticated && (
                            <div className="absolute top-0 right-0 flex">
                              <ObjektSelect objekt={objekt} />
                              <ObjektHoverMenu>
                                {isProfileAuthed && (
                                  <>
                                    <TogglePinMenuItem
                                      isPin={item.isPin}
                                      profile={profile!}
                                      tokenId={objekt.id}
                                    />
                                    <ToggleLockMenuItem
                                      isLocked={item.isLocked}
                                      profile={profile!}
                                      tokenId={objekt.id}
                                    />
                                  </>
                                )}
                                <AddToListMenu objekt={objekt} />
                              </ObjektHoverMenu>
                            </div>
                          )}
                          <ObjektOverlay isPin={item.isPin} isLocked={item.isLocked} />
                          {isProfileAuthed && (
                            <div className="absolute top-0 left-0 hidden group-hover:flex">
                              <ObjektTogglePin
                                isPin={item.isPin}
                                profile={profile!}
                                tokenId={objekt.id}
                              />
                              <ObjektToggleLock
                                isLocked={item.isLocked}
                                profile={profile!}
                                tokenId={objekt.id}
                              />
                            </div>
                          )}
                        </ObjektView>
                      )}
                    </ObjektViewSelectable>
                  )}
                </ObjektModal>
              );
            }}
          </ObjektsRenderRow>
        ),
      }),
    ]);
  }, [deferredObjektsFiltered, filters.grouped, columns, authenticated, isProfileAuthed, profile]);

  useEffect(() => {
    const shaped = shapeObjekts(
      filters,
      joinedObjekts,
      artists,
      pinsQuery.data,
      lockedObjektQuery.data,
    );
    const allGroupedObjekts = shaped.flatMap(([, objekts]) => objekts);
    const allObjekts = allGroupedObjekts.flatMap((item) => item.item);
    setGroupCount(allGroupedObjekts.length);
    setCount(allObjekts.length);
    setObjektsFiltered(shaped);
  }, [filters, joinedObjekts, artists, pinsQuery.data, lockedObjektQuery.data]);

  if (ownedQuery.isLoading)
    return (
      <div className="flex justify-center">
        <Loader variant="ring" />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <FloatingSelectMode>
          {({ handleAction }) => (
            <>
              <AddToList handleAction={handleAction} />
              {isProfileAuthed && (
                <>
                  <PinObjekt address={profile!.address} handleAction={handleAction} />
                  <UnpinObjekt address={profile!.address} handleAction={handleAction} />
                </>
              )}
            </>
          )}
        </FloatingSelectMode>
        <FilterContainer>
          <Filters
            address={profile!.address}
            authenticated={authenticated}
            isOwned={isProfileAuthed}
          />
        </FilterContainer>
      </div>
      <span className="font-semibold">
        {count} total
        {filters.grouped ? ` (${groupCount} types)` : undefined}
      </span>

      <WindowVirtualizer>{virtualList}</WindowVirtualizer>
    </div>
  );
}

function Filters({
  address,
  authenticated,
  isOwned,
}: {
  address: string;
  authenticated: boolean;
  isOwned: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Filter />
      {authenticated && (
        <SelectMode>
          {({ handleAction }) => (
            <>
              <AddToList handleAction={handleAction} />
              {isOwned && (
                <>
                  <PinObjekt address={address} handleAction={handleAction} />
                  <UnpinObjekt address={address} handleAction={handleAction} />
                </>
              )}
            </>
          )}
        </SelectMode>
      )}
    </div>
  );
}
