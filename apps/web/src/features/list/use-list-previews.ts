import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listPreviewsOptions } from "./queries";

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
