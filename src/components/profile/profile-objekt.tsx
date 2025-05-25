"use client";

import {
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFilters } from "@/hooks/use-filters";
import {
  QueryErrorResetBoundary,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ObjektItem, shapeObjekts } from "@/lib/filter-utils";
import { Loader } from "../ui";
import { WindowVirtualizer } from "virtua";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
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
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import Filter from "./filter";
import { api } from "@/lib/trpc/client";
import {
  ObjektHoverMenu,
  ObjektOverlay,
  ObjektSelect,
  ObjektTogglePin,
} from "../objekt/objekt-action";
import { FilterContainer } from "../filters/filter-container";
import { FilterSheet } from "../filters/filter-sheet";
import { useProfileAuthed, useUser } from "@/hooks/use-user";
import { PinObjekt, UnpinObjekt } from "./form/pin-unpin";
import { AddToList } from "../list/modal/manage-objekt";
import ObjektModal from "../objekt/objekt-modal";
import {
  AddToListMenu,
  ObjektStaticMenu,
  SelectMenuItem,
  TogglePinMenuItem,
} from "../objekt/objekt-menu";

export default function ProfileObjektRender() {
  return (
    <ObjektSelectProvider>
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

  const objektsQuery = useQuery({
    ...collectionOptions,
    enabled: filters.unowned ?? false,
  });
  const ownedQuery = useSuspenseQuery(ownedCollectionOptions(profile!.address));

  const pinsQuery = api.pins.get.useQuery(profile!.address, {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const joinedObjekts = useMemo(() => {
    if (filters.unowned) {
      const ownedSlugs = new Set(ownedQuery.data.map((obj) => obj.slug));
      const missingObjekts = (objektsQuery.data ?? []).filter(
        (obj) => !ownedSlugs.has(obj.slug)
      );
      return [...ownedQuery.data, ...missingObjekts];
    }
    return ownedQuery.data;
  }, [ownedQuery.data, filters.unowned, objektsQuery.data]);

  const virtualList = useMemo(() => {
    return deferredObjektsFiltered.flatMap(([title, items]) => [
      ...(title
        ? [<GroupLabelRender title={title} key={`label-${title}`} />]
        : []),
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
                  isProfile
                  menu={
                    authenticated && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        {isProfileAuthed && (
                          <TogglePinMenuItem
                            isPin={item.type === "pin"}
                            profile={profile!}
                            tokenId={objekt.id}
                          />
                        )}
                        <AddToListMenu objekt={objekt} />
                      </ObjektStaticMenu>
                    )
                  }
                >
                  {({ openObjekts }) => (
                    <ObjektViewSelectable
                      objekt={objekt}
                      openObjekts={openObjekts}
                    >
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
                                  <TogglePinMenuItem
                                    isPin={item.type === "pin"}
                                    profile={profile!}
                                    tokenId={objekt.id}
                                  />
                                )}
                                <AddToListMenu objekt={objekt} />
                              </ObjektHoverMenu>
                            </div>
                          )}
                          <ObjektOverlay isPin={item.type === "pin"} />
                          {isProfileAuthed && (
                            <ObjektTogglePin
                              isPin={item.type === "pin"}
                              profile={profile!}
                              tokenId={objekt.id}
                            />
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
  }, [
    deferredObjektsFiltered,
    filters.grouped,
    columns,
    authenticated,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <FloatingSelectMode>
          {({ handleAction }) => (
            <>
              <AddToList handleAction={handleAction} />
              {isProfileAuthed && (
                <>
                  <PinObjekt
                    address={profile!.address}
                    handleAction={handleAction}
                  />
                  <UnpinObjekt
                    address={profile!.address}
                    handleAction={handleAction}
                  />
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
        <FilterSheet>
          <Filters
            address={profile!.address}
            authenticated={authenticated}
            isOwned={isProfileAuthed}
          />
        </FilterSheet>
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
