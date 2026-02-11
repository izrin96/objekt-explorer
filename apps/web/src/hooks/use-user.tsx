"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";
import { sessionOptions } from "@/lib/query-options";

import { useTarget } from "./use-target";

export function useSession() {
  return useSuspenseQuery(sessionOptions);
}

export function useUserProfiles() {
  const { data: session } = useSession();

  return useQuery({
    ...orpc.profile.list.queryOptions(),
    enabled: session !== null,
  });
}

export function useUserLists() {
  const { data: session } = useSession();

  return useQuery({
    ...orpc.list.list.queryOptions(),
    enabled: session !== null,
  });
}

export function useProfileAuthed() {
  const target = useTarget((a) => a.profile);
  return target?.isOwned ?? false;
}

export function useListAuthed() {
  const target = useTarget((a) => a.list);
  return target?.isOwned ?? false;
}
