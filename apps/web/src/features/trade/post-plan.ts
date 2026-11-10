import { useMemo } from "react";

import { useUserLists } from "@/features/user/hooks";

import { toPlanList } from "./plan-list";

/** The viewer's lists the composer, Your posts and the Trade line read. */
export function usePlanLists() {
  const lists = useUserLists();
  return useMemo(() => lists.map(toPlanList), [lists]);
}
