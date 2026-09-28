import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { linkedPreviewsOptions } from "./queries";

/**
 * A card's preview: undefined while loading, null when it could not be read.
 * A link or unlink changes the key, so the other cards keep theirs meanwhile.
 */
export function useLinkedPreviews(addresses: string[]) {
  const { data, isPending } = useQuery({
    ...linkedPreviewsOptions(addresses),
    placeholderData: keepPreviousData,
  });
  return (address: string) => (isPending ? undefined : (data?.get(address.toLowerCase()) ?? null));
}
