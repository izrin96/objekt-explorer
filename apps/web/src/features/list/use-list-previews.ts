import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listPreviewsOptions, profilePreviewsOptions } from "./queries";

/**
 * A card's preview: undefined while loading, null when it could not be read.
 * A created or deleted list changes the key, so the other cards keep theirs meanwhile.
 */
export function useListPreviews(slugs: string[]) {
  const { data, isPending } = useQuery({
    ...listPreviewsOptions(slugs),
    placeholderData: keepPreviousData,
  });
  return (slug: string) => (isPending ? undefined : (data?.get(slug) ?? null));
}

/** The same for a profile's lists, read by its address. */
export function useProfilePreviews(address: string) {
  const { data, isPending } = useQuery(profilePreviewsOptions(address));
  return (slug: string) => (isPending ? undefined : (data?.get(slug) ?? null));
}
