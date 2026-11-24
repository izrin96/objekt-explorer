import { useSuspenseQuery } from "@tanstack/react-query";

import { currentUserOptions } from "./queries";

export function useCurrentUser() {
  return useSuspenseQuery(currentUserOptions);
}

export function useUserProfiles() {
  const { data: user } = useCurrentUser();
  return user?.profiles ?? [];
}

export function useUserLists() {
  const { data: user } = useCurrentUser();
  return user?.lists ?? [];
}

/** The lists the viewer manages; post-only lists back posts and show only where trading reads them. */
export function useShelfLists() {
  return useUserLists().filter((list) => !list.postOnly);
}
