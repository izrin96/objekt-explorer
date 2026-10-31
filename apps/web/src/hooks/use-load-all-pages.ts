import type { FetchNextPageOptions } from "@tanstack/react-query";
import { useEffect } from "react";

/** Keeps paging while `enabled`: a filter that runs in the browser has to see every row. */
export function useLoadAllPages(
  enabled: boolean,
  {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  }: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    fetchNextPage: (options?: FetchNextPageOptions) => Promise<unknown>;
  },
) {
  useEffect(() => {
    if (enabled && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      // two observers of one query run this in the same commit; without `cancelRefetch: false`
      // the second call aborts the first and every page is requested twice
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [enabled, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
}
