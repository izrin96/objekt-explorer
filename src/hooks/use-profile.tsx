"use client";

import { createContext, type PropsWithChildren, useContext, useRef } from "react";
import { createStore, type StoreApi, useStore } from "zustand";
import type { PublicList } from "@/lib/server/api/routers/list";
import type { PinObjekt } from "@/lib/universal/objekts";
import type { PublicProfile } from "@/lib/universal/user";

type ProfileProps = {
  profile: PublicProfile | undefined;
  list: PublicList | undefined;
  pins: PinObjekt[];
};

interface ProfileState extends ProfileProps {
  addPin: (pin: PinObjekt) => void;
  removePin: (tokenId: string) => void;
}

const ProfileContext = createContext<StoreApi<ProfileState> | null>(null);

type ProviderProps = PropsWithChildren<Partial<ProfileProps>>;

const createProfileStore = (initial: Partial<ProfileProps>) => {
  const DEFAULT_PROPS: ProfileProps = {
    profile: undefined,
    list: undefined,
    pins: [],
  };

  return createStore<ProfileState>()((set) => ({
    ...DEFAULT_PROPS,
    ...initial,
    addPin: (pin: PinObjekt) =>
      set((state) => ({
        ...state,
        pins: [pin, ...state.pins],
      })),
    removePin: (tokenId: string) =>
      set((state) => ({
        ...state,
        pins: state.pins.filter((p) => p.tokenId !== tokenId),
      })),
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
