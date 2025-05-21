"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFilters } from "@/hooks/use-filters";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import { ObjektItem, shapeObjekts } from "@/lib/filter-utils";
import { Button, Loader } from "../ui";
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
import { SelectMode } from "../filters/select-mode";
import { authClient } from "@/lib/auth-client";
import Filter from "./filter";
import { api } from "@/lib/trpc/client";
import { ObjektOverlay } from "../objekt/objekt-action";
import { FilterContainer } from "../filters/filter-container";
import { FilterSheet } from "../filters/filter-sheet";
import { useProfileAuthed } from "@/hooks/use-user";
import { PinObjekt, UnpinObjekt } from "./form/pin-unpin";
import { AddToList } from "../list/modal/manage-objekt";
import ObjektModal from "../objekt/objekt-modal";

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
              <ProfileObjekt />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektModalProvider>
    </ObjektSelectProvider>
  );
}

function ProfileObjekt() {
  const session = authClient.useSession();
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
  const ownedQuery = useQuery(ownedCollectionOptions(profile!.address));
  // todo: store state into context
  const pinsQuery = api.pins.get.useQuery(profile!.address, {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const joinedObjekts = useMemo(() => {
    if (filters.unowned) {
      const ownedSlugs = new Set(
        (ownedQuery.data ?? []).map((obj) => obj.slug)
      );
      const missingObjekts = (objektsQuery.data ?? []).filter(
        (obj) => !ownedSlugs.has(obj.slug)
      );
      return [...(ownedQuery.data ?? []), ...missingObjekts];
    }
    return ownedQuery.data ?? [];
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
                <ObjektModal key={objekt.id} objekts={item.item} isProfile>
                  {({ openObjekts }) => (
                    <ObjektViewSelectable
                      objekt={objekt}
                      openObjekts={openObjekts}
                      enableSelect={session.data !== null}
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
    session.data,
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

  if (ownedQuery.isLoading)
    return (
      <div className="justify-center flex">
        <Loader variant="ring" />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <FilterContainer>
          <Filters address={profile!.address} />
        </FilterContainer>
        <FilterSheet>
          <Filters address={profile!.address} />
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

function Filters({ address }: { address: string }) {
  const session = authClient.useSession();
  const isProfileAuthed = useProfileAuthed();
  return (
    <div className="flex flex-col gap-6">
      <Filter />
      {session.data && (
        <SelectMode>
          {({ handleAction }) => (
            <>
              <AddToList>
                {({ open }) => (
                  <Button intent="outline" onClick={() => handleAction(open)}>
                    Add to list
                  </Button>
                )}
              </AddToList>
              {isProfileAuthed && (
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
