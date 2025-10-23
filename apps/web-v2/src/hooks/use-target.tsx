import { createContext, type PropsWithChildren, useContext, useEffect, useRef } from "react";
import { createStore, type StoreApi, useStore } from "zustand";
import type { PublicList, PublicProfile } from "@/lib/universal/user";
import { useUser } from "./use-user";

type TargetProps = {
  profile?: PublicProfile | null;
  list?: PublicList | null;
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

  useEffect(() => {
    if (storeRef.current) storeRef.current.setState(props);
  }, [props]);

  return <TargetContext value={storeRef.current}>{children}</TargetContext>;
}

export function useTarget<SelectorOutput>(selector: (state: TargetState) => SelectorOutput) {
  const store = useContext(TargetContext);
  if (!store) {
    throw new Error("useTarget must be used within an TargetContext");
  }
  return useStore(store, selector);
}

export function useProfileAuthed() {
  const target = useTarget((a) => a.profile);
  const { profiles } = useUser();
  return profiles?.some((a) => a.address === target?.address) ?? false;
}

export function useListAuthed() {
  const list = useTarget((a) => a.list);
  const { lists } = useUser();
  return lists?.some((a) => a.slug === list?.slug) ?? false;
}
