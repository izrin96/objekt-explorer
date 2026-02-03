"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

export function useSelectedArtists() {
  return useSuspenseQuery({
    ...orpc.config.getArtists.queryOptions(),
    staleTime: Infinity,
  });
}
