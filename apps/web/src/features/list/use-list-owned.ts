import { useUserLists } from "@/features/user/hooks";

import { useListTarget } from "./list-provider";

/** The owner's own lists are the ones `currentUser` carries; a viewer's are not. */
export function useListOwned(): boolean {
  const list = useListTarget();
  const lists = useUserLists();
  return lists.some((owned) => owned.slug === list.slug);
}
