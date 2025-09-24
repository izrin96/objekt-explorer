"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Suspense, useDeferredValue, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";
import { useConfigStore } from "@/hooks/use-config";
import { useFilters } from "@/hooks/use-filters";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useProfileObjekts } from "@/hooks/use-profile-objekt";
import { useTarget } from "@/hooks/use-target";
import { useProfileAuthed, useUser } from "@/hooks/use-user";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { SPIN_ADDRESS } from "@/lib/utils";
import { makeObjektRows, ObjektsRenderRow } from "../collection/collection-render";
import { GroupLabelRender } from "../collection/label-render";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { AddToList } from "../filters/objekt/add-remove-list";
import { LockObjekt, UnlockObjekt } from "../filters/objekt/lock-unlock";
import { PinObjekt, UnpinObjekt } from "../filters/objekt/pin-unpin";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
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

export const ProfileObjektRenderDynamic = dynamic(() => Promise.resolve(ProfileObjektRender), {
  ssr: false,
});

export default function ProfileObjektRender() {
  const profile = useTarget((a) => a.profile)!;
  return (
    <ObjektColumnProvider initialColumn={profile.gridColumns}>
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
    </ObjektColumnProvider>
  );
}

function ProfileObjekt() {
  const { authenticated } = useUser();
  const isProfileAuthed = useProfileAuthed();
  const [filters] = useFilters();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { columns } = useObjektColumn();
  const { shaped, filtered, grouped } = useProfileObjekts();
  const deferredObjekts = useDeferredValue(shaped);

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
                            <TogglePinMenuItem isPin={item.isPin} tokenId={objekt.id} />
                            <ToggleLockMenuItem isLocked={item.isLocked} tokenId={objekt.id} />
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
                                    <TogglePinMenuItem isPin={item.isPin} tokenId={objekt.id} />
                                    <ToggleLockMenuItem
                                      isLocked={item.isLocked}
                                      tokenId={objekt.id}
                                    />
                                  </>
                                )}
                                <AddToListMenu objekt={objekt} />
                              </ObjektHoverMenu>
                            </div>
                          )}
                          <ObjektOverlay isPin={item.isPin} isLocked={item.isLocked} />
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
  }, [deferredObjekts, filters.grouped, columns, authenticated, isProfileAuthed, hideLabel]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {authenticated && (
          <FloatingSelectMode objekts={filtered}>
            {({ handleAction }) => (
              <>
                <AddToList handleAction={handleAction} size="sm" />
                {isProfileAuthed && (
                  <>
                    <PinObjekt handleAction={handleAction} size="sm" />
                    <UnpinObjekt handleAction={handleAction} size="sm" />
                    <LockObjekt handleAction={handleAction} size="sm" />
                    <UnlockObjekt handleAction={handleAction} size="sm" />
                  </>
                )}
              </>
            )}
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <Filters authenticated={authenticated} isOwned={isProfileAuthed} objekts={filtered} />
        </FilterContainer>
      </div>
      <span className="font-semibold">
        {filtered.length.toLocaleString()} total
        {filters.grouped ? ` (${grouped.length.toLocaleString()} types)` : ""}
      </span>

      <div className="[&>*]:!overflow-visible [&>*]:!contain-[inherit] [&>*>*]:will-change-transform">
        <WindowVirtualizer>{virtualList}</WindowVirtualizer>
      </div>
    </div>
  );
}

function Filters({
  authenticated,
  isOwned,
  objekts,
}: {
  authenticated: boolean;
  isOwned: boolean;
  objekts: ValidObjekt[];
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <Filter />
      {authenticated && (
        <SelectMode objekts={objekts}>
          {({ handleAction }) => (
            <>
              <AddToList handleAction={handleAction} />
              {isOwned && (
                <>
                  <PinObjekt handleAction={handleAction} />
                  <UnpinObjekt handleAction={handleAction} />
                  <LockObjekt handleAction={handleAction} />
                  <UnlockObjekt handleAction={handleAction} />
                </>
              )}
            </>
          )}
        </SelectMode>
      )}
    </div>
  );
}
