import { createContext, use } from "react";

import { type AddableObjekt, type AddTarget } from "./add-to-list-source";

export type OpenAddToList = (
  objekts: AddableObjekt[],
  options?: Pick<AddTarget, "combined" | "saleOnly">,
) => void;

export const AddToListContext = createContext<OpenAddToList | null>(null);

export function useOpenAddToList(): OpenAddToList {
  const open = use(AddToListContext);
  if (!open) throw new Error("useOpenAddToList must be used within AddToListProvider");
  return open;
}
