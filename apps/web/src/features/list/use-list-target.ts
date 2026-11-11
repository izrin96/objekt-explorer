import type { PublicList } from "@repo/api/schemas/list";
import { createContext, use } from "react";

/** the list page's read: the public list plus whether it offers Message to the viewer */
export type ListTarget = PublicList & { messageable: boolean };

export const ListContext = createContext<ListTarget | null>(null);

export function useListTarget(): ListTarget {
  const list = use(ListContext);
  if (!list) throw new Error("useListTarget must be used within ListProvider");
  return list;
}
