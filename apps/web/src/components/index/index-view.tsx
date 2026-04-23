"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import { useCollectionObjekts } from "@/hooks/use-collection-objekt";
import { useConfigStore } from "@/hooks/use-config";
import { useSession } from "@/hooks/use-user";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridItem } from "../collection/objekt-grid-item";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import { ObjektVirtualGrid } from "../collection/objekt-virtual-grid";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { AddToList } from "../filters/objekt/add-remove-list";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { Loader } from "../intentui/loader";
import { AddToListMenu, ObjektStaticMenu, SelectMenuItem } from "../objekt/objekt-menu";
import Filter from "./filter";

export default dynamic(() => Promise.resolve(IndexRender), {
  ssr: false,
});

function IndexRender() {
  const [selectTarget, setSelectTarget] = useState<HTMLDivElement | null>(null);
  return (
    <ObjektViewProvider modalTab="trades">
      <div className="flex flex-col gap-4">
        <IndexFilter selectRef={setSelectTarget} />

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
                <IndexView selectTarget={selectTarget} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </ObjektViewProvider>
  );
}

function IndexFilter({ selectRef }: { selectRef: (el: HTMLDivElement | null) => void }) {
  return (
    <FilterContainer>
      <div className="flex w-full flex-col gap-4">
        <Filter />
        <div className="contents" ref={selectRef} />
      </div>
    </FilterContainer>
  );
}

function IndexView({ selectTarget }: { selectTarget: HTMLDivElement | null }) {
  const { data: session } = useSession();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { shaped, filtered } = useCollectionObjekts();

  const renderObjekt = useCallback(
    ({ item }: { item: ValidObjekt[] }) => {
      const objekt = item[0];
      if (!objekt) return null;
      return (
        <ObjektGridItem
          objekts={item}
          session={!!session}
          staticMenu={
            <ObjektStaticMenu>
              <SelectMenuItem objekts={item} />
              <AddToListMenu objekts={[objekt]} />
            </ObjektStaticMenu>
          }
          hoverMenu={<AddToListMenu objekts={[objekt]} />}
          viewProps={{ hideLabel }}
        />
      );
    },
    [session, hideLabel],
  );

  return (
    <>
      <FloatingSelectMode objekts={filtered}>
        <AddToList size="sm" />
      </FloatingSelectMode>

      {session &&
        selectTarget &&
        createPortal(
          <SelectMode objekts={filtered}>
            <AddToList />
          </SelectMode>,
          selectTarget,
        )}

      <ObjektCount filtered={filtered} />
      <ObjektVirtualGrid shaped={shaped} renderItem={renderObjekt} />
    </>
  );
}
