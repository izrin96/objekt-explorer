import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import { useConfigStore } from "@/hooks/use-config";
import { useProfileObjekts } from "@/hooks/use-profile-objekt";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { useCurrentUser, useProfileAuthed } from "@/hooks/use-user";
import { isObjektOwned } from "@/lib/objekt-utils";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridActions, ObjektGridOverlay, ObjektGridView } from "../collection/objekt-grid";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import { ObjektVirtualGrid } from "../collection/objekt-virtual-grid";
import { FilterContainer } from "../filters/filter-container";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { Loader } from "../intentui/loader";
import { AddToList } from "../objekt/actions/add-to-list";
import { AddToListMenu } from "../objekt/actions/list-menu";
import { ToggleLockMenuItem } from "../objekt/actions/lock-menu";
import { LockObjekt, UnlockObjekt } from "../objekt/actions/lock-unlock";
import { ObjektStaticMenu } from "../objekt/actions/objekt-static-menu";
import { MovePinMenuItem, TogglePinMenuItem } from "../objekt/actions/pin-menu";
import { PinObjekt, UnpinObjekt } from "../objekt/actions/pin-unpin";
import { SelectMenuItem } from "../objekt/actions/select-menu";
import ErrorFallbackRender from "../router/error-boundary";
import { GenerateDiscordButton } from "../shared/generate-discord-button";
import CheckpointPicker from "./checkpoint-picker";
import Filter from "./filter";

export default function ProfileObjektRender() {
  const profile = useProfileTarget()!;
  const [selectTarget, setSelectTarget] = useState<HTMLDivElement | null>(null);
  const [discordTarget, setDiscordTarget] = useState<HTMLDivElement | null>(null);

  return (
    <ObjektViewProvider initialColumn={profile.gridColumns ?? undefined} modalTab="owned">
      <div className="flex flex-col gap-4">
        <ProfileObjektFilters selectRef={setSelectTarget} discordRef={setDiscordTarget} />

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <ProfileObjekt
                selectTarget={selectTarget}
                discordTarget={discordTarget}
                address={profile.address}
              />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </ObjektViewProvider>
  );
}

function ProfileObjektFilters({
  selectRef,
  discordRef,
}: {
  selectRef: (el: HTMLDivElement | null) => void;
  discordRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <FilterContainer>
      <div className="flex w-full flex-col gap-4">
        <Filter discordRef={discordRef} />
        <CheckpointPicker />
        <div className="contents" ref={selectRef} />
      </div>
    </FilterContainer>
  );
}

function ProfileObjekt({
  selectTarget,
  discordTarget,
  address,
}: {
  selectTarget: HTMLDivElement | null;
  discordTarget: HTMLDivElement | null;
  address: string;
}) {
  const { data: user } = useCurrentUser();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { shaped, filtered, grouped, filters, hasNextPage, isPending } = useProfileObjekts();
  const isProfileAuthed = useProfileAuthed();
  const showActions = user && !filters.at;

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;

      const isOwned = isObjektOwned(objekt);

      return (
        <ObjektGridView
          objekts={item}
          hideLabel={hideLabel}
          showCount
          showSerial={!filters.grouped}
          isFade={!isOwned}
          isPriority={rowIndex < 3}
          staticMenu={
            showActions && (
              <ObjektStaticMenu>
                <SelectMenuItem objekts={item} />
                {isProfileAuthed && isOwned && (
                  <>
                    <TogglePinMenuItem isPin={objekt.isPin ?? false} tokenId={objekt.id} />
                    {objekt.isPin && (
                      <>
                        <MovePinMenuItem tokenId={objekt.id} direction="up" />
                        <MovePinMenuItem tokenId={objekt.id} direction="down" />
                      </>
                    )}
                    <ToggleLockMenuItem isLocked={objekt.isLocked ?? false} tokenId={objekt.id} />
                  </>
                )}
                <AddToListMenu objekts={[objekt]} address={address} />
              </ObjektStaticMenu>
            )
          }
        >
          {showActions && (
            <ObjektGridActions objekts={item}>
              {isProfileAuthed && isOwned && (
                <>
                  <TogglePinMenuItem isPin={objekt.isPin ?? false} tokenId={objekt.id} />
                  {objekt.isPin && (
                    <>
                      <MovePinMenuItem tokenId={objekt.id} direction="up" />
                      <MovePinMenuItem tokenId={objekt.id} direction="down" />
                    </>
                  )}
                  <ToggleLockMenuItem isLocked={objekt.isLocked ?? false} tokenId={objekt.id} />
                </>
              )}
              <AddToListMenu objekts={[objekt]} address={address} />
            </ObjektGridActions>
          )}
          {isOwned && (
            <ObjektGridOverlay isPin={objekt.isPin ?? false} isLocked={objekt.isLocked ?? false} />
          )}
        </ObjektGridView>
      );
    },
    [showActions, hideLabel, isProfileAuthed, address, filters.grouped],
  );

  if (isPending) {
    return (
      <div className="flex justify-center">
        <Loader variant="ring" />
      </div>
    );
  }

  return (
    <>
      {showActions && (
        <FloatingSelectMode objekts={filtered}>
          <AddToList size="sm" address={address} />
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

      {showActions &&
        selectTarget &&
        createPortal(
          <SelectMode objekts={filtered}>
            <AddToList address={address} />
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

      <ObjektCount
        filtered={filtered}
        grouped={filters.grouped ? grouped : undefined}
        hasNextPage={hasNextPage}
      />
      <ObjektVirtualGrid shaped={shaped} renderItem={renderObjekt} />
    </>
  );
}
