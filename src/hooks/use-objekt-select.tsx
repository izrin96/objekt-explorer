"use client";

import { PropsWithChildren, createContext, useContext, useRef } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { ValidObjekt } from "@/lib/universal/objekts";

type ObjektSelectedState = {
  mode: boolean;
  toggleMode: () => void;
  selected: ValidObjekt[];
  select: (selected: ValidObjekt) => void;
  isSelected: (selected: ValidObjekt) => boolean;
  reset: () => void;
  remove: (selected: ValidObjekt) => void;
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

    select: (selected) =>
      set((state) => {
        const exists = state.selected.some((a) => a.id === selected.id);
        return {
          ...state,
          selected: exists
            ? state.selected.filter((a) => a.id !== selected.id)
            : [...state.selected, selected],
        };
      }),

    isSelected: (selected) => get().selected.some((a) => a.id === selected.id),

    reset: () => set((state) => ({ ...state, selected: [] })),

    remove: (selected) =>
      set((state) => ({
        ...state,
        selected: state.selected.filter((a) => a.id !== selected.id),
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
