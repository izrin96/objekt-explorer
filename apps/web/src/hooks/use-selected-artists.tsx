"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

export function useSelectedArtists() {
  return useSuspenseQuery(
    orpc.config.getSelectedArtists.queryOptions({
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    }),
  );
}
