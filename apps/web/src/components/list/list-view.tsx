"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import { type PropsWithChildren, use } from "react";
import { createContext, useCallback, useState } from "react";

import { useConfigStore } from "@/hooks/use-config";
import { useListObjekts } from "@/hooks/use-list-objekt";
import { useTarget } from "@/hooks/use-target";
import { useListAuthed, useSession } from "@/hooks/use-user";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridItem } from "../collection/objekt-grid-item";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import type { ShapedData } from "../collection/objekt-virtual-grid";
import { ObjektVirtualGrid } from "../collection/objekt-virtual-grid";
import { FilterContainer } from "../filters/filter-container";
import { AddToList, RemoveFromList, SetPrice } from "../filters/objekt/add-remove-list";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import {
  AddToListMenu,
  ObjektStaticMenu,
  RemoveFromListMenu,
  SelectMenuItem,
  SetPriceMenuItem,
} from "../objekt/objekt-menu";
import Filter from "./filter";
import { SetPriceModal } from "./modal/set-price-modal";

export default function ListRender() {
  const list = useTarget((a) => a.list)!;
  const isProfileList = list.listType === "profile";

  return (
    <ObjektViewProvider
      initialColumn={list.gridColumns ?? undefined}
      modalTab={isProfileList ? "owned" : "trades"}
    >
      <SetPriceProvider>
        <ListView />
      </SetPriceProvider>
    </ObjektViewProvider>
  );
}

const SetPriceContext = createContext<{ openSetPrice: (val: ValidObjekt[]) => void }>({
  openSetPrice: () => {},
});

function SetPriceProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ValidObjekt[]>([]);

  return (
    <SetPriceContext
      value={{
        openSetPrice: (val) => {
          setSelected(val);
          setOpen(true);
        },
      }}
    >
      <SetPriceModal open={open} setOpen={setOpen} objekts={selected} />
      {children}
    </SetPriceContext>
  );
}

function ListView() {
  const { data: session } = useSession();
  const isOwned = useListAuthed();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { shaped, filtered, grouped, filters } = useListObjekts();
  const list = useTarget((a) => a.list)!;
  const { openSetPrice } = use(SetPriceContext);

  const isProfileList = list.listType === "profile";

  const renderObjekt = useCallback(
    ({ item }: { item: ValidObjekt[] }) => {
      const objekt = item[0];
      if (!objekt) return null;

      return (
        <ObjektGridItem
          objekts={item}
          session={!!session}
          showSelect
          staticMenu={
            <ObjektStaticMenu>
              <SelectMenuItem objekts={item} />
              {isOwned && <RemoveFromListMenu objekts={item} />}
              {isOwned && list.currency && <SetPriceMenuItem onAction={() => openSetPrice(item)} />}
              <AddToListMenu objekts={[objekt]} />
            </ObjektStaticMenu>
          }
          hoverMenu={
            <>
              {isOwned && <RemoveFromListMenu objekts={item} />}
              {isOwned && list.currency && <SetPriceMenuItem onAction={() => openSetPrice(item)} />}
              <AddToListMenu objekts={[objekt]} />
            </>
          }
          viewProps={{
            hideLabel,
            showCount: true,
            showSerial: !filters.grouped && isProfileList,
            showOwned: isProfileList,
            listCurrency: list.currency,
            onSetPrice: isOwned ? () => openSetPrice(item) : undefined,
          }}
        />
      );
    },
    [session, hideLabel, isOwned, list.currency, isProfileList, filters.grouped, openSetPrice],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {session && (
          <FloatingSelectMode objekts={filtered}>
            {isOwned && <RemoveFromList size="sm" />}
            {isOwned && list.currency && <SetPrice size="sm" />}
            <AddToList size="sm" />
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <div className="flex w-full flex-col gap-6">
            <Filter objekts={filtered} />
            {session && (
              <SelectMode objekts={filtered}>
                {isOwned && <RemoveFromList />}
                {isOwned && list.currency && <SetPrice />}
                <AddToList />
              </SelectMode>
            )}
          </div>
        </FilterContainer>
      </div>
      <ObjektCount filtered={filtered} grouped={filters.grouped ? grouped : undefined} />
      <ObjektVirtualGrid shaped={shaped as ShapedData} renderItem={renderObjekt} />
    </div>
  );
}
