import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";
import { currentUserOptions } from "@/lib/query-options";

import { useListTarget } from "./use-list-target";
import { useProfileTarget } from "./use-profile-target";

export function useCurrentUser() {
  return useSuspenseQuery(currentUserOptions);
}

export function useUserProfiles() {
  return useQuery(orpc.profile.list.queryOptions());
}

export function useUserLists() {
  return useQuery(orpc.list.list.queryOptions());
}

export function useProfileAuthed() {
  const target = useProfileTarget();
  const { data: profiles } = useUserProfiles();
  if (!target) return false;
  return profiles?.some((u) => u.address.toLowerCase() === target.address.toLowerCase()) ?? false;
}

export function useListAuthed() {
  const target = useListTarget();
  const { data: lists } = useUserLists();
  if (!target) return false;
  return lists?.some((l) => l.slug === target.slug) ?? false;
}
