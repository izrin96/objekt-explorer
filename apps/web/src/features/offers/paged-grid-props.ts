import { isRefusalError, refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

import { offerRefusalOf, offerRefusalText } from "./refusal";

function loadError(error: unknown, refetch: () => Promise<unknown>) {
  const refusal = offerRefusalOf(error);
  return {
    retry: () => void refetch(),
    // a refusal outside the offer domain, such as the picker's rate limit, has its own text
    text: refusal
      ? (offerRefusalText(refusal, m.offer_refused_some()) ?? null)
      : isRefusalError(error)
        ? refusalText(error)
        : null,
  };
}

/** The loading, error and paging props the grid reads off an infinite candidates query. */
export function pagedGridProps(
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => Promise<unknown>;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    fetchNextPage: (options?: { cancelRefetch?: boolean }) => Promise<unknown>;
  },
  loaded: number,
) {
  return {
    pending: query.isPending,
    error: query.isError && loaded === 0 ? loadError(query.error, query.refetch) : null,
    more: {
      has: query.hasNextPage,
      loading: query.isFetchingNextPage,
      failed: query.isFetchNextPageError,
      load: () => void query.fetchNextPage({ cancelRefetch: false }),
    },
  };
}
