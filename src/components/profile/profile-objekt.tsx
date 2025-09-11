"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Suspense, useDeferredValue, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";
import { useBreakpointColumnStore } from "@/hooks/use-breakpoint-column";
import { useConfigStore } from "@/hooks/use-config";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useProfileObjekts } from "@/hooks/use-profile-objekt";
import { useTarget } from "@/hooks/use-target";
import { useProfileAuthed, useUser } from "@/hooks/use-user";
import { SPIN_ADDRESS } from "@/lib/utils";
import { makeObjektRows, ObjektsRenderRow } from "../collection/collection-render";
import { GroupLabelRender } from "../collection/label-render";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { AddToList } from "../list/modal/manage-objekt";
import { ObjektHoverMenu, ObjektOverlay, ObjektSelect } from "../objekt/objekt-action";
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
import { Link, Loader, Note } from "../ui";
import Filter from "./filter";
import { LockObjekt, UnlockObjekt } from "./form/lock-unlock";
import { PinObjekt, UnpinObjekt } from "./form/pin-unpin";

export const ProfileObjektRenderDynamic = dynamic(() => Promise.resolve(ProfileObjektRender), {
  ssr: false,
});

function ProfileObjektRender() {
  const profile = useTarget((a) => a.profile)!;
  return (
    <ObjektSelectProvider>
      <ObjektModalProvider initialTab="owned">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <Suspense
                fallback={
                  <div className="flex flex-col items-center gap-4">
                    {profile.address.toLowerCase() === SPIN_ADDRESS && (
                      <Note intent="danger" className="w-fit">
                        Loading cosmo-spin objekts may take some time because it loads the entire
                        collection at once. Please use{" "}
                        <Link href="https://apollo.cafe/@cosmo-spin">Apollo</Link> for faster
                        loading.
                      </Note>
                    )}
                    <div className="flex justify-center">
                      <Loader variant="ring" />
                    </div>
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
  const profile = useTarget((a) => a.profile)!;
  const [filters] = useFilters();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const columns = useBreakpointColumnStore((a) => a.columns);
  const objekts = useProfileObjekts();
  const deferredObjekts = useDeferredValue(objekts);

  const [groupCount, count] = useMemo(() => {
    const groupedObjekts = deferredObjekts.flatMap(([, objekts]) => objekts);
    return [groupedObjekts.length, groupedObjekts.flatMap((item) => item.item).length];
  }, [deferredObjekts]);

  const virtualList = useMemo(() => {
    return deferredObjekts.flatMap(([title, items]) => [
      ...(title ? [<GroupLabelRender title={title} key={`label-${title}`} />] : []),
      ...makeObjektRows({
        items,
        columns,
        renderItem: ({ items, rowIndex }) => (
          <ObjektsRenderRow
            key={`${title}-${rowIndex}`}
            columns={columns}
            rowIndex={rowIndex}
            items={items}
          >
            {({ item, index }) => {
              const [objekt] = item.item;
              const isOwned = "serial" in objekt;
              return (
                <ObjektModal
                  key={objekt.id}
                  objekts={item.item}
                  showOwned
                  menu={
                    authenticated && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        {isProfileAuthed && isOwned && (
                          <>
                            <TogglePinMenuItem
                              isPin={item.isPin}
                              profile={profile}
                              tokenId={objekt.id}
                            />
                            <ToggleLockMenuItem
                              isLocked={item.isLocked}
                              profile={profile}
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
                          hideLabel={hideLabel}
                          open={open}
                          // for profile
                          showCount
                          showSerial={!filters.grouped}
                          isFade={!isOwned}
                        >
                          {authenticated && (
                            <div className="absolute top-0 right-0 flex">
                              <ObjektSelect objekt={objekt} />
                              <ObjektHoverMenu>
                                {isProfileAuthed && isOwned && (
                                  <>
                                    <TogglePinMenuItem
                                      isPin={item.isPin}
                                      profile={profile}
                                      tokenId={objekt.id}
                                    />
                                    <ToggleLockMenuItem
                                      isLocked={item.isLocked}
                                      profile={profile}
                                      tokenId={objekt.id}
                                    />
                                  </>
                                )}
                                <AddToListMenu objekt={objekt} />
                              </ObjektHoverMenu>
                            </div>
                          )}
                          <ObjektOverlay isPin={item.isPin} isLocked={item.isLocked} />
                          {/* {isProfileAuthed && isOwned && (
                            <div className="absolute top-0 left-0 hidden group-hover:flex">
                              <ObjektTogglePin
                                isPin={item.isPin}
                                profile={profile}
                                tokenId={objekt.id}
                              />
                              <ObjektToggleLock
                                isLocked={item.isLocked}
                                profile={profile}
                                tokenId={objekt.id}
                              />
                            </div>
                          )} */}
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
    deferredObjekts,
    filters.grouped,
    columns,
    authenticated,
    isProfileAuthed,
    profile,
    hideLabel,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {authenticated && (
          <FloatingSelectMode>
            {({ handleAction }) => (
              <>
                <AddToList handleAction={handleAction} />
                {isProfileAuthed && (
                  <>
                    <PinObjekt address={profile.address} handleAction={handleAction} />
                    <UnpinObjekt address={profile.address} handleAction={handleAction} />
                    <LockObjekt address={profile.address} handleAction={handleAction} />
                    <UnlockObjekt address={profile.address} handleAction={handleAction} />
                  </>
                )}
              </>
            )}
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <Filters
            address={profile.address}
            authenticated={authenticated}
            isOwned={isProfileAuthed}
          />
        </FilterContainer>
      </div>
      <span className="font-semibold">
        {count.toLocaleString()} total
        {filters.grouped ? ` (${groupCount.toLocaleString()} types)` : ""}
      </span>

      <div className="[&>*]:!overflow-visible [&>*>*]:will-change-transform">
        <WindowVirtualizer key={`${columns}-${hideLabel}`}>{virtualList}</WindowVirtualizer>
      </div>
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
    <div className="flex w-full flex-col gap-6">
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
                  <LockObjekt address={address} handleAction={handleAction} />
                  <UnlockObjekt address={address} handleAction={handleAction} />
                </>
              )}
            </>
          )}
        </SelectMode>
      )}
    </div>
  );
}
