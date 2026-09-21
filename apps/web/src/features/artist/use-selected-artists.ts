import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export function useSelectedArtists() {
  return useSuspenseQuery(
    orpc.config.getSelectedArtists.queryOptions({
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    }),
  );
}

/**
 * The scope lives in an httpOnly cookie the server reads, so the mutation has
 * to round-trip before the query that mirrors it is worth refetching.
 */
export function useSetSelectedArtists() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.config.setArtists.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(),
    }),
  );
}
