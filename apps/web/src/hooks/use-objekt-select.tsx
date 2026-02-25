"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useTranslations } from "next-intl";
import { createContext, type PropsWithChildren, useContext, useRef } from "react";
import { toast } from "sonner";
import { createStore, type StoreApi, useStore } from "zustand";

type ObjektSelectedState = {
  mode: boolean;
  toggleMode: () => void;
  selected: Map<string, ValidObjekt>;
  getSelected: () => ValidObjekt[];
  select: (selected: ValidObjekt[]) => void;
  batchSelect: (selected: ValidObjekt[]) => void;
  isSelected: (selected: ValidObjekt) => boolean;
  reset: () => void;
  handleAction: (callback: () => void) => void;
  handleSelect: (objekts: ValidObjekt[], callback: () => void) => void;
};

const createObjektSelectStore = (errorMessage: string) =>
  createStore<ObjektSelectedState>()((set, get) => ({
    mode: false,

    toggleMode: () =>
      set((state) => ({
        mode: !state.mode,
      })),

    selected: new Map(),

    getSelected: () => Array.from(get().selected.values()),

    select: (selected) =>
      set((state) => {
        const map = new Map(state.selected);
        for (const item of selected) {
          if (map.has(item.id)) {
            map.delete(item.id);
          } else {
            map.set(item.id, item);
          }
        }
        return { selected: map, mode: map.size > 0 };
      }),

    batchSelect: (selected) =>
      set(() => {
        return {
          selected: new Map(selected.toReversed().map((a) => [a.id, a])),
          mode: true,
        };
      }),

    isSelected: (selected) => get().selected.has(selected.id),

    reset: () => set(() => ({ selected: new Map(), mode: false })),

    handleAction: (callback) => {
      if (get().selected.size === 0) {
        toast.error(errorMessage);
      } else {
        callback();
      }
    },

    handleSelect: (objekts, callback) => {
      if (get().mode) {
        get().select(objekts);
      } else {
        callback();
      }
    },
  }));

const ObjektSelectContext = createContext<StoreApi<ObjektSelectedState> | null>(null);

export function ObjektSelectProvider({ children }: PropsWithChildren) {
  const t = useTranslations("objekt");
  const storeRef = useRef<StoreApi<ObjektSelectedState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createObjektSelectStore(t("must_select_one"));
  }

  return <ObjektSelectContext value={storeRef.current}>{children}</ObjektSelectContext>;
}

export function useObjektSelect<SelectorOutput>(
  selector: (state: ObjektSelectedState) => SelectorOutput,
) {
  const store = useContext(ObjektSelectContext);
  if (!store) {
    throw new Error("useObjektSelect must be used within ObjektSelectProvider");
  }
  return useStore(store, selector);
}
