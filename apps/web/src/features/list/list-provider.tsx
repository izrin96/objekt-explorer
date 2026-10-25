import type { PublicList } from "@repo/api/schemas/list";
import { createContext, type ReactNode, use } from "react";

/** the list page's read: the public list plus whether it offers Message to the viewer */
type ListTarget = PublicList & { messageable: boolean };

const ListContext = createContext<ListTarget | null>(null);

export function ListProvider({ list, children }: { list: ListTarget; children: ReactNode }) {
  return <ListContext value={list}>{children}</ListContext>;
}

export function useListTarget(): ListTarget {
  const list = use(ListContext);
  if (!list) throw new Error("useListTarget must be used within ListProvider");
  return list;
}
