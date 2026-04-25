import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

import type { PublicList } from "@/lib/universal/user";

type ContextProps = {
  list: PublicList;
};

const ListContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<ContextProps>;

export function ListProvider({ children, list }: ProviderProps) {
  return <ListContext value={{ list }}>{children}</ListContext>;
}

export function useListTarget() {
  const ctx = useContext(ListContext);
  if (!ctx) throw new Error("useListTarget must be used within ListProvider");
  return ctx.list;
}
