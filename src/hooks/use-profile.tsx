"use client";

import { PinObjekt } from "@/lib/universal/objekts";
import { PublicProfile } from "@/lib/universal/user";
import { PropsWithChildren, createContext, useContext, useRef } from "react";
import { createStore, StoreApi, useStore } from "zustand";

type ProfileProps = {
  profile: PublicProfile | undefined;
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
    pins: [],
  };

  return createStore<ProfileState>()((set, get) => ({
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

export function useProfile<SelectorOutput>(
  selector: (state: ProfileState) => SelectorOutput
) {
  const store = useContext(ProfileContext);
  if (!store) {
    throw new Error("useProfile must be used within an ProfileContext");
  }
  return useStore(store, selector);
}
