import { artistsArraySchema } from "@repo/api/schemas/common/artist";
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
 * The scope lives in an httpOnly cookie, so the mirror updates once the cookie is set. Only
 * `getSelectedArtists` reads the cookie; every other artist-scoped query takes the artists as input,
 * so its key changes with the mirror and it fetches on its own. Invalidating everything instead
 * refetched every page of the rate-limited Trade feed and every open chat thread.
 */
export function useSetSelectedArtists() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.config.setArtists.mutationOptions({
      onSuccess: (_, artists) => {
        // read back as `getSelectedArtists` reads the cookie
        queryClient.setQueryData(
          orpc.config.getSelectedArtists.queryKey(),
          artistsArraySchema.catch([]).parse(artists),
        );
      },
    }),
  );
}
