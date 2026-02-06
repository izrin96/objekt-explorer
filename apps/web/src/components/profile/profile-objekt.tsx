"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Suspense, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";

import { useConfigStore } from "@/hooks/use-config";
import { useFilters } from "@/hooks/use-filters";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useProfileObjekts } from "@/hooks/use-profile-objekt";
import { useTarget } from "@/hooks/use-target";
import { useProfileAuthed, useSession } from "@/hooks/use-user";
import { isObjektOwned } from "@/lib/objekt-utils";

import { makeObjektRows, ObjektsRenderRow } from "../collection/collection-render";
import { GroupLabelRender } from "../collection/label-render";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { AddToList } from "../filters/objekt/add-remove-list";
import { LockObjekt, UnlockObjekt } from "../filters/objekt/lock-unlock";
import { PinObjekt, UnpinObjekt } from "../filters/objekt/pin-unpin";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { GenerateDiscordButton } from "../generate-discord-button";
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
import CheckpointPicker from "./checkpoint-picker";
import Filter from "./filter";

export default dynamic(() => Promise.resolve(ProfileObjektRender), {
  ssr: false,
});

function ProfileObjektRender() {
  const profile = useTarget((a) => a.profile)!;
  const [floatingTarget, setFloatingTarget] = useState<HTMLDivElement | null>(null);
  const [selectTarget, setSelectTarget] = useState<HTMLDivElement | null>(null);
  const [discordTarget, setDiscordTarget] = useState<HTMLDivElement | null>(null);

  return (
    <ObjektColumnProvider initialColumn={profile.gridColumns}>
      <ObjektSelectProvider>
        <ObjektModalProvider initialTab="owned">
          <div className="flex flex-col gap-4">
            <ProfileObjektFilters
              floatingRef={setFloatingTarget}
              selectRef={setSelectTarget}
              discordRef={setDiscordTarget}
            />
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
                    <ProfileObjekt
                      floatingTarget={floatingTarget}
                      selectTarget={selectTarget}
                      discordTarget={discordTarget}
                    />
                  </Suspense>
                </ErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </div>
        </ObjektModalProvider>
      </ObjektSelectProvider>
    </ObjektColumnProvider>
  );
}

function ProfileObjektFilters({
  floatingRef,
  selectRef,
  discordRef,
}: {
  floatingRef: (el: HTMLDivElement | null) => void;
  selectRef: (el: HTMLDivElement | null) => void;
  discordRef: (el: HTMLDivElement | null) => void;
}) {
  const { data: session } = useSession();
  const [filters] = useFilters();

  return (
    <div className="mb-2 flex flex-col gap-6">
      {session && !filters.at && <div ref={floatingRef} />}
      <FilterContainer>
        <div className="flex w-full flex-col gap-6">
          <Filter discordRef={discordRef} />
          <CheckpointPicker />
          {session && !filters.at && <div ref={selectRef} />}
        </div>
      </FilterContainer>
    </div>
  );
}

function ProfileObjekt({
  floatingTarget,
  selectTarget,
  discordTarget,
}: {
  floatingTarget: HTMLDivElement | null;
  selectTarget: HTMLDivElement | null;
  discordTarget: HTMLDivElement | null;
}) {
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { columns } = useObjektColumn();
  const { shaped, filtered, grouped, filters, hasNextPage } = useProfileObjekts();
  const { data: session } = useSession();
  const isProfileAuthed = useProfileAuthed();

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
                    session &&
                    !filters.at && (
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
                        {session && !filters.at && (
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
  }, [shaped, filters.grouped, filters.at, columns, session, isProfileAuthed, hideLabel]);

  return (
    <>
      {floatingTarget &&
        createPortal(
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
          </FloatingSelectMode>,
          floatingTarget,
        )}

      {selectTarget &&
        createPortal(
          <SelectMode objekts={filtered}>
            <AddToList />
            {isProfileAuthed && (
              <>
                <PinObjekt />
                <UnpinObjekt />
                <LockObjekt />
                <UnlockObjekt />
              </>
            )}
          </SelectMode>,
          selectTarget,
        )}

      {discordTarget && createPortal(<GenerateDiscordButton objekts={filtered} />, discordTarget)}

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
    </>
  );
}
