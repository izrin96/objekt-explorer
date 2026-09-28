import { useUserLists } from "@/features/user/hooks";

import { useListTarget } from "./list-provider";

/** The owner's own lists are the ones `currentUser` carries; a viewer's are not. */
export function useIsListOwner(slug: string): boolean {
  return useUserLists().some((owned) => owned.slug === slug);
}

export function useListOwned(): boolean {
  return useIsListOwner(useListTarget().slug);
}
