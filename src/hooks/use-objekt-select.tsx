"use client";

import { PropsWithChildren, createContext, useContext, useRef } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { ValidObjekt } from "@/lib/universal/objekts";

type Id = ValidObjekt["id"];

type ObjektSelectedState = {
  mode: boolean;
  toggleMode: () => void;
  selected: Id[];
  select: (id: Id) => void;
  isSelected: (id: Id) => boolean;
  hasSelected: (ids: Id[]) => boolean;
  reset: () => void;
  remove: (id: Id) => void;
};

const createObjektSelectStore = () =>
  createStore<ObjektSelectedState>()((set, get) => ({
    mode: false,

    toggleMode: () =>
      set((state) => ({
        ...state,
        mode: !state.mode,
      })),

    selected: [],

    select: (id) =>
      set((state) => {
        const exists = state.selected.includes(id);
        return {
          ...state,
          selected: exists
            ? state.selected.filter((a) => a !== id)
            : [...state.selected, id],
        };
      }),

    isSelected: (id) => get().selected.includes(id),

    hasSelected: (ids) => get().selected.some((id) => ids.includes(id)),

    reset: () => set((state) => ({ ...state, selected: [] })),

    remove: (id) =>
      set((state) => ({
        ...state,
        selected: state.selected.filter((a) => a !== id),
      })),
  }));

const ObjektSelectContext = createContext<StoreApi<ObjektSelectedState> | null>(
  null
);

export function ObjektSelectProvider({ children }: PropsWithChildren) {
  const storeRef = useRef<StoreApi<ObjektSelectedState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createObjektSelectStore();
  }

  return (
    <ObjektSelectContext.Provider value={storeRef.current}>
      {children}
    </ObjektSelectContext.Provider>
  );
}

export function useObjektSelect<SelectorOutput>(
  selector: (state: ObjektSelectedState) => SelectorOutput
) {
  const store = useContext(ObjektSelectContext);
  if (!store) {
    throw new Error("useObjektSelect must be used within ObjektSelectProvider");
  }
  return useStore(store, selector);
}
