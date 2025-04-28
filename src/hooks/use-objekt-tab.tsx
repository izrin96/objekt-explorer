"use client";

import { PropsWithChildren, createContext, useContext, useRef } from "react";
import { createStore, useStore, type StoreApi } from "zustand";

export type ValidTab = "owned" | "trades";

const ObjektTabContext = createContext<StoreApi<ObjektTab> | null>(null);

type ProviderProps = PropsWithChildren<{
  initialTab: ValidTab;
}>;

interface ObjektTab {
  currentTab: ValidTab;
  setCurrentTab: (tab: ValidTab) => void;
}

const createObjektTabStore = (initialTab: ValidTab) => {
  return createStore<ObjektTab>()((set) => ({
    currentTab: initialTab,
    setCurrentTab: (tab) => set(() => ({ currentTab: tab })),
  }));
};

export function ObjektTabProvider({ children, initialTab }: ProviderProps) {
  const storeRef = useRef<StoreApi<ObjektTab> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createObjektTabStore(initialTab);
  }

  return (
    <ObjektTabContext value={storeRef.current}>{children}</ObjektTabContext>
  );
}

export function useObjektTab<SelectorOutput>(
  selector: (state: ObjektTab) => SelectorOutput
) {
  const store = useContext(ObjektTabContext);
  if (!store) {
    throw new Error("useObjektTab must be used within an ObjektTabProvider");
  }
  return useStore(store, selector);
}
