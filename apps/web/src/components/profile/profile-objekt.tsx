"use client";

import type { ValidObjekt } from "@repo/lib/objekts";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";

import { useConfigStore } from "@/hooks/use-config";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useProfileObjekts } from "@/hooks/use-profile-objekt";
import { useTarget } from "@/hooks/use-target";
import { useProfileAuthed, useUser } from "@/hooks/use-user";
import { isObjektOwned } from "@/lib/objekt-utils";

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
import { Loader } from "../ui/loader";
import Filter from "./filter";

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
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { columns } = useObjektColumn();
  const { shaped, filtered, grouped, filters, hasNextPage } = useProfileObjekts();

  const virtualList = useMemo(() => {
    return shaped.flatMap(([title, items]) => [
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
              const [objekt] = item as [ValidObjekt];
              const isOwned = isObjektOwned(objekt);
              return (
                <ObjektModal
                  key={objekt.id}
                  objekts={item}
                  showOwned
                  menu={
                    authenticated && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        {isProfileAuthed && isOwned && (
                          <>
                            <TogglePinMenuItem isPin={objekt.isPin} tokenId={objekt.id} />
                            <ToggleLockMenuItem isLocked={objekt.isLocked} tokenId={objekt.id} />
                          </>
                        )}
                        <AddToListMenu objekt={objekt} />
                      </ObjektStaticMenu>
                    )
                  }
                >
                  <ObjektViewSelectable objekt={objekt}>
                    {({ isSelected }) => (
                      <ObjektView
                        objekts={item}
                        priority={index < columns * 3}
                        isSelected={isSelected}
                        hideLabel={hideLabel}
                        // for profile
                        showCount
                        showSerial={!filters.grouped}
                        isFade={!isOwned}
                      >
                        {authenticated && (
                          <div className="flex items-start self-start justify-self-end">
                            <ObjektSelect objekt={objekt} />
                            <ObjektHoverMenu>
                              {isProfileAuthed && isOwned && (
                                <>
                                  <TogglePinMenuItem isPin={objekt.isPin} tokenId={objekt.id} />
                                  <ToggleLockMenuItem
                                    isLocked={objekt.isLocked}
                                    tokenId={objekt.id}
                                  />
                                </>
                              )}
                              <AddToListMenu objekt={objekt} />
                            </ObjektHoverMenu>
                          </div>
                        )}
                        {isOwned && (
                          <ObjektOverlay isPin={objekt.isPin} isLocked={objekt.isLocked} />
                        )}
                      </ObjektView>
                    )}
                  </ObjektViewSelectable>
                </ObjektModal>
              );
            }}
          </ObjektsRenderRow>
        ),
      }),
    ]);
  }, [shaped, filters.grouped, columns, authenticated, isProfileAuthed, hideLabel]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {authenticated && (
          <FloatingSelectMode objekts={filtered}>
            <AddToList size="sm" />
            {isProfileAuthed && (
              <>
                <PinObjekt size="sm" />
                <UnpinObjekt size="sm" />
                <LockObjekt size="sm" />
                <UnlockObjekt size="sm" />
              </>
            )}
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <Filters authenticated={authenticated} isOwned={isProfileAuthed} objekts={filtered} />
        </FilterContainer>
      </div>
      <span className="flex items-center gap-2 font-semibold">
        <span>
          {filtered.length.toLocaleString()} total
          {filters.grouped ? ` (${grouped.length.toLocaleString()} types)` : ""}
        </span>
        {hasNextPage && <Loader variant="ring" className="size-4" />}
      </span>

      <div className="[&>*>*]:will-change-transform">
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
      <Filter objekts={objekts} />
      {authenticated && (
        <SelectMode objekts={objekts}>
          <AddToList />
          {isOwned && (
            <>
              <PinObjekt />
              <UnpinObjekt />
              <LockObjekt />
              <UnlockObjekt />
            </>
          )}
        </SelectMode>
      )}
    </div>
  );
}
