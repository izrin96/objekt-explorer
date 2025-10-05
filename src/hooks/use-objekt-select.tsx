"use client";

import { createContext, type PropsWithChildren, useContext, useRef } from "react";
import { toast } from "sonner";
import { createStore, type StoreApi, useStore } from "zustand";
import type { ValidObjekt } from "@/lib/universal/objekts";

type ObjektSelectedState = {
  mode: boolean;
  toggleMode: () => void;
  selected: Map<string, ValidObjekt>;
  getSelected: () => ValidObjekt[];
  select: (selected: ValidObjekt) => void;
  batchSelect: (selected: ValidObjekt[]) => void;
  isSelected: (selected: ValidObjekt) => boolean;
  reset: () => void;
  handleAction: (open: () => void) => void;
};

const createObjektSelectStore = () =>
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
        if (map.has(selected.id)) {
          map.delete(selected.id);
        } else {
          map.set(selected.id, selected);
        }
        return { selected: map };
      }),

    batchSelect: (selected) =>
      set(() => {
        return {
          selected: new Map(selected.map((a) => [a.id, a])),
        };
      }),

    isSelected: (selected) => get().selected.has(selected.id),

    reset: () => set(() => ({ selected: new Map() })),

    handleAction: (open: () => void) => {
      if (get().selected.size === 0) {
        toast.error("Must select at least one objekt");
      } else {
        open();
      }
    },
  }));

const ObjektSelectContext = createContext<StoreApi<ObjektSelectedState> | null>(null);

export function ObjektSelectProvider({ children }: PropsWithChildren) {
  const storeRef = useRef<StoreApi<ObjektSelectedState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createObjektSelectStore();
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
