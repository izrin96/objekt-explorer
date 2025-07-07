"use client";

import { createContext, type PropsWithChildren, useContext, useRef } from "react";
import { createStore, type StoreApi, useStore } from "zustand";
import type { PublicList, PublicProfile } from "@/lib/universal/user";

type TargetProps = {
  profile: PublicProfile | undefined;
  list: PublicList | undefined;
};

interface TargetState extends TargetProps {}

const TargetContext = createContext<StoreApi<TargetState> | null>(null);

type ProviderProps = PropsWithChildren<Partial<TargetProps>>;

const createTargetStore = (initial: Partial<TargetProps>) => {
  const DEFAULT_PROPS: TargetProps = {
    profile: undefined,
    list: undefined,
  };

  return createStore<TargetState>()(() => ({
    ...DEFAULT_PROPS,
    ...initial,
  }));
};

export function TargetProvider({ children, ...props }: ProviderProps) {
  const storeRef = useRef<StoreApi<TargetState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createTargetStore(props);
  }
  return <TargetContext value={storeRef.current}>{children}</TargetContext>;
}

export function useTarget<SelectorOutput>(selector: (state: TargetState) => SelectorOutput) {
  const store = useContext(TargetContext);
  if (!store) {
    throw new Error("useTarget must be used within an TargetContext");
  }
  return useStore(store, selector);
}
