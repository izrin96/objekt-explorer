import { useSuspenseQuery } from "@tanstack/react-query";

import { currentUserOptions } from "@/lib/query-options";

import { useListTarget } from "./use-list-target";
import { useProfileTarget } from "./use-profile-target";

export function useCurrentUser() {
  return useSuspenseQuery(currentUserOptions);
}

export function useUserProfiles() {
  const { data: user } = useCurrentUser();
  if (!user) return [];
  return user.profiles;
}

export function useUserLists() {
  const { data: user } = useCurrentUser();
  if (!user) return [];
  return user.lists;
}

export function useProfileAuthed() {
  const target = useProfileTarget();
  const profiles = useUserProfiles();
  if (!target) return false;
  return profiles.some((u) => u.address.toLowerCase() === target.address.toLowerCase());
}

export function useListAuthed() {
  const target = useListTarget();
  const lists = useUserLists();
  if (!target) return false;
  return lists.some((l) => l.slug === target.slug);
}
