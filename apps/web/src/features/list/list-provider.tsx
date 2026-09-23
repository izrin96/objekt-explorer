import type { PublicList } from "@repo/api/schemas/list";
import { createContext, type ReactNode, use } from "react";

const ListContext = createContext<PublicList | null>(null);

export function ListProvider({ list, children }: { list: PublicList; children: ReactNode }) {
  return <ListContext value={list}>{children}</ListContext>;
}

export function useListTarget(): PublicList {
  const list = use(ListContext);
  if (!list) throw new Error("useListTarget must be used within ListProvider");
  return list;
}
