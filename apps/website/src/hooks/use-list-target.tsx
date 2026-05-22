import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

import type { PublicList } from "@/lib/universal/user";

type ContextProps = {
  list: PublicList;
};

const ListContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<ContextProps>;

export function ListProvider({ children, list }: ProviderProps) {
  const value = useMemo(() => ({ list }), [list]);
  return <ListContext value={value}>{children}</ListContext>;
}

export function useListTarget() {
  const ctx = useContext(ListContext);
  return ctx?.list;
}
