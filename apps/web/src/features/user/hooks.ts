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
