import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import { useCollectionObjekts } from "@/hooks/use-collection-objekt";
import { useConfigStore } from "@/hooks/use-config";
import { useCurrentUser } from "@/hooks/use-user";
import { m } from "@/paraglide/messages";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridView, ObjektGridActions } from "../collection/objekt-grid";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import { ObjektVirtualGrid } from "../collection/objekt-virtual-grid";
import { FilterContainer } from "../filters/filter-container";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { Loader } from "../intentui/loader";
import { AddToList } from "../objekt/actions/add-to-list";
import { AddToListMenu } from "../objekt/actions/list-menu";
import { ObjektStaticMenu } from "../objekt/actions/objekt-static-menu";
import { SelectMenuItem } from "../objekt/actions/select-menu";
import ErrorFallbackRender from "../router/error-boundary";
import Filter from "./filter";

export default function IndexRender() {
  const [selectTarget, setSelectTarget] = useState<HTMLDivElement | null>(null);
  return (
    <ObjektViewProvider modalTab="trades">
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">{m.home_title()}</h2>
        <IndexFilter selectRef={setSelectTarget} />

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <IndexView selectTarget={selectTarget} />
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
  const { data: user } = useCurrentUser();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { shaped, filtered, isPending } = useCollectionObjekts();

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;
      return (
        <ObjektGridView
          objekts={item}
          hideLabel={hideLabel}
          isPriority={rowIndex < 3}
          staticMenu={
            user && (
              <ObjektStaticMenu>
                <SelectMenuItem objekts={item} />
                <AddToListMenu objekts={[objekt]} />
              </ObjektStaticMenu>
            )
          }
        >
          {user && (
            <ObjektGridActions objekts={item}>
              <AddToListMenu objekts={[objekt]} />
            </ObjektGridActions>
          )}
        </ObjektGridView>
      );
    },
    [user, hideLabel],
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
      {user && (
        <FloatingSelectMode objekts={filtered}>
          <AddToList size="sm" />
        </FloatingSelectMode>
      )}

      {user &&
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
