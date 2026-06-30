import { Addresses } from "@repo/lib";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import { useConfigStore } from "@/hooks/use-config";
import { useProfileObjektsServer } from "@/hooks/use-profile-objekt-server";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { useCurrentUser } from "@/hooks/use-user";
import { m } from "@/paraglide/messages";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridActions, ObjektGridView } from "../collection/objekt-grid";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import { ObjektVirtualGrid, ObjektVirtualGridLoadMore } from "../collection/objekt-virtual-grid";
import { FilterContainer } from "../filters/filter-container";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { Loader } from "../intentui/loader";
import { Note } from "../intentui/note";
import { AddToList, AddToListMenu } from "../objekt/actions/list";
import { SelectMenuItem } from "../objekt/actions/select";
import { ObjektStaticMenu } from "../objekt/actions/static-menu";
import ErrorFallbackRender from "../router/error-boundary";
import FilterServer from "./filter-server";

export default function ProfileObjektServerRender() {
  const profile = useProfileTarget()!;
  const [selectTarget, setSelectTarget] = useState<HTMLDivElement | null>(null);

  return (
    <ObjektViewProvider initialColumn={profile.gridColumns ?? undefined} modalTab="owned">
      <div className="flex flex-col gap-4">
        {profile.address.toLowerCase() === Addresses.SPIN && (
          <Note intent="default" className="max-w-xl">
            {m.profile_spin_notice()}
          </Note>
        )}

        <ProfileObjektFilters selectRef={setSelectTarget} />

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <ProfileObjektServer selectTarget={selectTarget} />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </ObjektViewProvider>
  );
}

function ProfileObjektFilters({ selectRef }: { selectRef: (el: HTMLDivElement | null) => void }) {
  return (
    <FilterContainer>
      <div className="flex w-full flex-col gap-4">
        <FilterServer />
        <div className="contents" ref={selectRef} />
      </div>
    </FilterContainer>
  );
}

function ProfileObjektServer({ selectTarget }: { selectTarget: HTMLDivElement | null }) {
  const { data: user } = useCurrentUser();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { filtered, total, query, filters } = useProfileObjektsServer();
  const showActions = user && !filters.at;

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;

      return (
        <ObjektGridView
          objekts={item}
          hideLabel={hideLabel}
          showCount
          showSerial
          isPriority={rowIndex < 3}
          staticMenu={
            showActions && (
              <ObjektStaticMenu>
                <SelectMenuItem objekts={item} />
                <AddToListMenu objekts={[objekt]} />
              </ObjektStaticMenu>
            )
          }
        >
          {showActions && (
            <ObjektGridActions objekts={item}>
              <AddToListMenu objekts={[objekt]} />
            </ObjektGridActions>
          )}
        </ObjektGridView>
      );
    },
    [showActions, hideLabel],
  );

  if (query.isPending) {
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
          <AddToList size="sm" />
        </FloatingSelectMode>
      )}

      {showActions &&
        selectTarget &&
        createPortal(
          <SelectMode objekts={filtered}>
            <AddToList />
          </SelectMode>,
          selectTarget,
        )}

      <ObjektCount filtered={filtered} total={total} />
      <ObjektVirtualGridLoadMore
        status={query.status}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={query.fetchNextPage}
      >
        <ObjektVirtualGrid
          objekts={filtered}
          filters={filters}
          isProfile
          renderItem={renderObjekt}
        />
      </ObjektVirtualGridLoadMore>
    </>
  );
}
