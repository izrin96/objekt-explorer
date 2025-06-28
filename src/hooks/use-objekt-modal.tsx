"use client";

import { createContext, type PropsWithChildren, useContext, useRef } from "react";
import { createStore, type StoreApi, useStore } from "zustand";

export type ValidTab = "owned" | "trades";

type ObjektModalProps = {
  initialTab: ValidTab;
};

const ObjektModalContext = createContext<StoreApi<ObjektModalState> | null>(null);

type ProviderProps = PropsWithChildren<ObjektModalProps>;

interface ObjektModalState {
  currentTab: ValidTab;
  setCurrentTab: (tab: ValidTab) => void;
}

const createObjektModalStore = (initial: ObjektModalProps) => {
  return createStore<ObjektModalState>()((set) => ({
    currentTab: initial.initialTab,
    setCurrentTab: (tab) => set(() => ({ currentTab: tab })),
  }));
};

export function ObjektModalProvider({ children, ...props }: ProviderProps) {
  const storeRef = useRef<StoreApi<ObjektModalState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createObjektModalStore(props);
  }

  return <ObjektModalContext value={storeRef.current}>{children}</ObjektModalContext>;
}

export function useObjektModal<SelectorOutput>(
  selector: (state: ObjektModalState) => SelectorOutput,
) {
  const store = useContext(ObjektModalContext);
  if (!store) {
    throw new Error("useObjektModal must be used within an ObjektModalProvider");
  }
  return useStore(store, selector);
}
