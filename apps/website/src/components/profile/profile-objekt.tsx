import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import { useReorderPins } from "@/hooks/actions/reorder-pins";
import { useConfigStore } from "@/hooks/use-config";
import { isFiltering } from "@/hooks/use-filters";
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
import { MenuSeparator } from "../intentui/menu";
import { AddToList, AddToListMenu } from "../objekt/actions/list";
import { LockObjekt, ToggleLockMenuItem, UnlockObjekt } from "../objekt/actions/lock";
import { MovePinMenuItem, PinObjekt, TogglePinMenuItem, UnpinObjekt } from "../objekt/actions/pin";
import { SelectMenuItem } from "../objekt/actions/select";
import { ObjektStaticMenu } from "../objekt/actions/static-menu";
import { DraggablePin, PinDndProvider } from "../objekt/pin-dnd";
import ErrorFallbackRender from "../router/error-boundary";
import { GenerateDiscordButton } from "../shared/generate-discord-button";
import CheckpointPicker from "./checkpoint-picker";
import Filter from "./filter";

export default function ProfileObjektRender() {
  const profile = useProfileTarget()!;
  const [selectTarget, setSelectTarget] = useState<HTMLDivElement | null>(null);
  const [discordTarget, setDiscordTarget] = useState<HTMLDivElement | null>(null);

  return (
    <ObjektViewProvider
      initialColumn={profile.gridColumns ?? undefined}
      modalTab="owned"
      isProfile
      showPinLock
    >
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
  const { filtered, grouped, filters, rarityMap, hasNextPage, isPending } = useProfileObjekts();
  const isProfileAuthed = useProfileAuthed();
  const showActions = user && !filters.at;
  const reorderPins = useReorderPins();

  const dndEnabled = Boolean(
    isProfileAuthed && showActions && !isFiltering(filters) && !filters.hidePin,
  );

  // Local override for pin order, applied instantly (same render/commit as
  // dnd-kit's own drag-end cleanup) so the drop frame shows the final order
  // without waiting on the mutation's cache update, which lands a tick later
  // via React Query's async notify scheduler.
  const [pinOrderOverride, setPinOrderOverride] = useState<Map<string, number> | null>(null);

  const handlePinReorder = useCallback(
    (tokenIds: string[]) => {
      // values must stay truthy — build-virtual-data's sort guard is
      // `a.pinOrder && b.pinOrder`, so a 0 would be treated as "no order".
      setPinOrderOverride(new Map(tokenIds.map((id, i) => [id, tokenIds.length - i])));
      reorderPins.mutate(
        { address, tokenIds: tokenIds.map(Number) },
        { onSettled: () => setPinOrderOverride(null) },
      );
    },
    [address, reorderPins],
  );

  const displayObjekts = useMemo(() => {
    if (!pinOrderOverride) return filtered;
    return filtered.map((o) =>
      isObjektOwned(o) && o.isPin && pinOrderOverride.has(o.tokenId)
        ? Object.assign({}, o, { pinOrder: pinOrderOverride.get(o.tokenId)! })
        : o,
    );
  }, [filtered, pinOrderOverride]);

  const pinnedTokenIds = useMemo(
    () =>
      displayObjekts
        .filter(isObjektOwned)
        .filter((item) => item.isPin === true)
        .toSorted((a, b) => (a.pinOrder && b.pinOrder ? b.pinOrder - a.pinOrder : 0))
        .map((item) => item.tokenId),
    [displayObjekts],
  );

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;

      const isOwned = isObjektOwned(objekt);

      const gridView = (
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
                    <TogglePinMenuItem isPin={objekt.isPin ?? false} tokenId={objekt.tokenId} />
                    {objekt.isPin && (
                      <>
                        <MovePinMenuItem tokenId={objekt.tokenId} direction="up" />
                        <MovePinMenuItem tokenId={objekt.tokenId} direction="down" />
                      </>
                    )}
                    <ToggleLockMenuItem
                      isLocked={objekt.isLocked ?? false}
                      tokenId={objekt.tokenId}
                    />
                    <MenuSeparator />
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
                  <TogglePinMenuItem isPin={objekt.isPin ?? false} tokenId={objekt.tokenId} />
                  {objekt.isPin && (
                    <>
                      <MovePinMenuItem tokenId={objekt.tokenId} direction="up" />
                      <MovePinMenuItem tokenId={objekt.tokenId} direction="down" />
                    </>
                  )}
                  <ToggleLockMenuItem
                    isLocked={objekt.isLocked ?? false}
                    tokenId={objekt.tokenId}
                  />
                  <MenuSeparator />
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

      if (dndEnabled && isOwned && objekt.isPin) {
        return <DraggablePin tokenId={objekt.tokenId}>{gridView}</DraggablePin>;
      }

      return gridView;
    },
    [showActions, hideLabel, isProfileAuthed, address, filters.grouped, dndEnabled],
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
      <PinDndProvider
        pinnedTokenIds={pinnedTokenIds}
        onReorder={handlePinReorder}
        disabled={!dndEnabled}
      >
        <ObjektVirtualGrid
          objekts={displayObjekts}
          filters={filters}
          rarityMap={rarityMap}
          isProfile
          renderItem={renderObjekt}
        />
      </PinDndProvider>
    </>
  );
}
