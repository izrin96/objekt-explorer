"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";

import { useConfigStore } from "@/hooks/use-config";
import { useFilters } from "@/hooks/use-filters";
import { useProfileObjekts } from "@/hooks/use-profile-objekt";
import { useTarget } from "@/hooks/use-target";
import { useProfileAuthed, useSession } from "@/hooks/use-user";
import { isObjektOwned } from "@/lib/objekt-utils";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridItem } from "../collection/objekt-grid-item";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import type { ShapedData } from "../collection/objekt-virtual-grid";
import { ObjektVirtualGrid } from "../collection/objekt-virtual-grid";
import { FilterContainer } from "../filters/filter-container";
import { AddToList } from "../filters/objekt/add-remove-list";
import { LockObjekt, UnlockObjekt } from "../filters/objekt/lock-unlock";
import { PinObjekt, UnpinObjekt } from "../filters/objekt/pin-unpin";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { GenerateDiscordButton } from "../generate-discord-button";
import { ObjektOverlay } from "../objekt/objekt-action";
import {
  AddToListMenu,
  ObjektStaticMenu,
  SelectMenuItem,
  ToggleLockMenuItem,
  TogglePinMenuItem,
} from "../objekt/objekt-menu";
import CheckpointPicker from "./checkpoint-picker";
import Filter from "./filter";

export default dynamic(() => Promise.resolve(ProfileObjektRender), {
  ssr: false,
});

function ProfileObjektRender() {
  const profile = useTarget((a) => a.profile)!;
  const [selectTarget, setSelectTarget] = useState<HTMLDivElement | null>(null);
  const [discordTarget, setDiscordTarget] = useState<HTMLDivElement | null>(null);

  return (
    <ObjektViewProvider initialColumn={profile.gridColumns ?? undefined} modalTab="owned">
      <div className="flex flex-col gap-4">
        <ProfileObjektFilters selectRef={setSelectTarget} discordRef={setDiscordTarget} />
        <ProfileObjekt
          selectTarget={selectTarget}
          discordTarget={discordTarget}
          address={profile.address}
        />
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
  const { data: session } = useSession();
  const [filters] = useFilters();

  return (
    <div className="mb-2 flex flex-col gap-6">
      <FilterContainer>
        <div className="flex w-full flex-col gap-6">
          <Filter discordRef={discordRef} />
          <CheckpointPicker />
          {session && !filters.at && <div className="contents" ref={selectRef} />}
        </div>
      </FilterContainer>
    </div>
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
  const { data: session } = useSession();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { shaped, filtered, grouped, filters, hasNextPage } = useProfileObjekts();
  const isProfileAuthed = useProfileAuthed();

  const renderObjekt = useCallback(
    ({ item }: { item: ValidObjekt[] }) => {
      const objekt = item[0];
      if (!objekt) return null;

      const isOwned = isObjektOwned(objekt);
      const showActions = session && !filters.at;

      return (
        <ObjektGridItem
          objekts={item}
          session={!!showActions}
          showSelect
          staticMenu={
            showActions && (
              <ObjektStaticMenu>
                <SelectMenuItem objekts={item} />
                {isProfileAuthed && isOwned && (
                  <>
                    <TogglePinMenuItem isPin={objekt.isPin ?? false} tokenId={objekt.id} />
                    <ToggleLockMenuItem isLocked={objekt.isLocked ?? false} tokenId={objekt.id} />
                  </>
                )}
                <AddToListMenu objekts={[objekt]} address={address} />
              </ObjektStaticMenu>
            )
          }
          hoverMenu={
            showActions && (
              <>
                {isProfileAuthed && isOwned && (
                  <>
                    <TogglePinMenuItem isPin={objekt.isPin ?? false} tokenId={objekt.id} />
                    <ToggleLockMenuItem isLocked={objekt.isLocked ?? false} tokenId={objekt.id} />
                  </>
                )}
                <AddToListMenu objekts={[objekt]} address={address} />
              </>
            )
          }
          overlay={
            isOwned && (
              <ObjektOverlay isPin={objekt.isPin ?? false} isLocked={objekt.isLocked ?? false} />
            )
          }
          viewProps={{
            hideLabel,
            showCount: true,
            showSerial: !filters.grouped,
            showOwned: true,
            isFade: !isOwned,
          }}
        />
      );
    },
    [session, hideLabel, isProfileAuthed, address, filters.grouped, filters.at],
  );

  return (
    <>
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

      {selectTarget &&
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
      <ObjektVirtualGrid shaped={shaped as ShapedData} renderItem={renderObjekt} />
    </>
  );
}
