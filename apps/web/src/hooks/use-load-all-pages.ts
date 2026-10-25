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
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [enabled, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
}
