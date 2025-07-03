"use client";

import { createContext, type PropsWithChildren, useContext, useRef } from "react";
import { createStore, type StoreApi, useStore } from "zustand";
import type { PublicList } from "@/lib/server/api/routers/list";
import type { PublicProfile } from "@/lib/universal/user";

type ProfileProps = {
  profile: PublicProfile | undefined;
  list: PublicList | undefined;
};

interface ProfileState extends ProfileProps {}

const ProfileContext = createContext<StoreApi<ProfileState> | null>(null);

type ProviderProps = PropsWithChildren<Partial<ProfileProps>>;

const createProfileStore = (initial: Partial<ProfileProps>) => {
  const DEFAULT_PROPS: ProfileProps = {
    profile: undefined,
    list: undefined,
  };

  return createStore<ProfileState>()(() => ({
    ...DEFAULT_PROPS,
    ...initial,
  }));
};

export function ProfileProvider({ children, ...props }: ProviderProps) {
  const storeRef = useRef<StoreApi<ProfileState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createProfileStore(props);
  }
  return <ProfileContext value={storeRef.current}>{children}</ProfileContext>;
}

export function useProfile<SelectorOutput>(selector: (state: ProfileState) => SelectorOutput) {
  const store = useContext(ProfileContext);
  if (!store) {
    throw new Error("useProfile must be used within an ProfileContext");
  }
  return useStore(store, selector);
}
