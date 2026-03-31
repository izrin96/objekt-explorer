"use client";

import { Addresses } from "@repo/lib";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import { useConfigStore } from "@/hooks/use-config";
import { useFilters } from "@/hooks/use-filters";
import { useProfileObjektsServer } from "@/hooks/use-profile-objekt-server";
import { useTarget } from "@/hooks/use-target";
import { useSession } from "@/hooks/use-user";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridItem } from "../collection/objekt-grid-item";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import type { ShapedData } from "../collection/objekt-virtual-grid";
import { ObjektVirtualGrid } from "../collection/objekt-virtual-grid";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { AddToList } from "../filters/objekt/add-remove-list";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { AddToListMenu, ObjektStaticMenu, SelectMenuItem } from "../objekt/objekt-menu";
import { Loader } from "../ui/loader";
import { Note } from "../ui/note";
import FilterServer from "./filter-server";

export default dynamic(() => Promise.resolve(ProfileObjektServerRender), {
  ssr: false,
});

function ProfileObjektServerRender() {
  const profile = useTarget((a) => a.profile)!;
  const [selectTarget, setSelectTarget] = useState<HTMLDivElement | null>(null);
  const locale = useLocale();

  return (
    <ObjektViewProvider initialColumn={profile.gridColumns ?? undefined} modalTab="owned">
      <div className="flex flex-col gap-4">
        {profile.address.toLowerCase() === Addresses.SPIN && (
          <Note intent="default" className="max-w-xl">
            {locale === "ko"
              ? "COSMO 스핀에서는 일부 필터를 사용할 수 없습니다. 폴리곤 체인에서 스핀된 오브젝트는 아직 병합되지 않았습니다."
              : "Some filters are unavailable for COSMO Spin. Objekts spun on the Polygon chain have not been merged yet."}
          </Note>
        )}

        <ProfileObjektFilters selectRef={setSelectTarget} />

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <Suspense
                fallback={
                  <div className="flex justify-center">
                    <Loader variant="ring" />
                  </div>
                }
              >
                <ProfileObjektServer selectTarget={selectTarget} address={profile.address} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </ObjektViewProvider>
  );
}

function ProfileObjektFilters({ selectRef }: { selectRef: (el: HTMLDivElement | null) => void }) {
  const { data: session } = useSession();
  const [filters] = useFilters();

  return (
    <div className="mb-2 flex flex-col gap-6">
      <FilterContainer>
        <div className="flex w-full flex-col gap-6">
          <FilterServer />
          {session && !filters.at && <div className="contents" ref={selectRef} />}
        </div>
      </FilterContainer>
    </div>
  );
}

function ProfileObjektServer({
  selectTarget,
  address,
}: {
  selectTarget: HTMLDivElement | null;
  address: string;
}) {
  const { data: session } = useSession();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { shaped, filtered, total, query } = useProfileObjektsServer();

  const renderObjekt = useCallback(
    ({ item }: { item: ValidObjekt[] }) => {
      const objekt = item[0];
      if (!objekt) return null;

      const showActions = session;

      return (
        <ObjektGridItem
          objekts={item}
          session={!!showActions}
          showSelect
          staticMenu={
            showActions && (
              <ObjektStaticMenu>
                <SelectMenuItem objekts={item} />
                <AddToListMenu objekts={[objekt]} address={address} />
              </ObjektStaticMenu>
            )
          }
          hoverMenu={showActions && <AddToListMenu objekts={[objekt]} address={address} />}
          viewProps={{
            hideLabel,
            showCount: true,
            showSerial: true,
            showOwned: true,
          }}
        />
      );
    },
    [session, hideLabel, address],
  );

  return (
    <>
      <FloatingSelectMode objekts={filtered}>
        <AddToList size="sm" address={address} />
      </FloatingSelectMode>

      {selectTarget &&
        createPortal(
          <SelectMode objekts={filtered}>
            <AddToList address={address} />
          </SelectMode>,
          selectTarget,
        )}

      <ObjektCount filtered={filtered} total={total} />
      <ObjektVirtualGrid
        shaped={shaped as ShapedData}
        renderItem={renderObjekt}
        infiniteQueryProp={query}
      />
    </>
  );
}
