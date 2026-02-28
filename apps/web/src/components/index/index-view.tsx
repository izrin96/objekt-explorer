"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import dynamic from "next/dynamic";
import { useCallback } from "react";

import { useCollectionObjekts } from "@/hooks/use-collection-objekt";
import { useConfigStore } from "@/hooks/use-config";
import { useSession } from "@/hooks/use-user";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridItem } from "../collection/objekt-grid-item";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import type { ShapedData } from "../collection/objekt-virtual-grid";
import { ObjektVirtualGrid } from "../collection/objekt-virtual-grid";
import { FilterContainer } from "../filters/filter-container";
import { AddToList } from "../filters/objekt/add-remove-list";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { AddToListMenu, ObjektStaticMenu, SelectMenuItem } from "../objekt/objekt-menu";
import Filter from "./filter";

export default dynamic(() => Promise.resolve(IndexRender), {
  ssr: false,
});

function IndexRender() {
  return (
    <ObjektViewProvider modalTab="trades">
      <IndexView />
    </ObjektViewProvider>
  );
}

function IndexView() {
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {session && (
          <FloatingSelectMode objekts={filtered}>
            <AddToList size="sm" />
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <div className="flex w-full flex-col gap-6">
            <Filter />
            {session && (
              <SelectMode objekts={filtered}>
                <AddToList />
              </SelectMode>
            )}
          </div>
        </FilterContainer>
      </div>
      <ObjektCount filtered={filtered} />
      <ObjektVirtualGrid shaped={shaped as ShapedData} renderItem={renderObjekt} />
    </div>
  );
}
