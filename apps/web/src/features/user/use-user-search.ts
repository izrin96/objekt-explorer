import { ORPCError } from "@orpc/client";
import { MAX_USER_SEARCH_LENGTH } from "@repo/api/schemas/user";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";

const DEBOUNCE_MS = 350;

/** the Cosmo user search: the typed query, and the debounced one it fetches */
export function useUserSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const debounce = useDebouncedCallback(setDebouncedQuery, DEBOUNCE_MS);
  const trimmed = debouncedQuery.trim();

  const { data, error, isFetching } = useQuery(
    orpc.user.search.queryOptions({
      input: { query: trimmed },
      select: (res) => res.results,
      // the server refuses a longer query, and no nickname or address is that long
      enabled: trimmed.length > 0 && trimmed.length <= MAX_USER_SEARCH_LENGTH,
      retry: false,
    }),
  );

  // a refusal is an answer, not a blank list
  const serverError = error instanceof ORPCError ? refusalText(error) : null;

  // the debounce wait counts as searching too, or the empty state flashes
  // "no users match" against every keystroke before the request even starts
  const searching = query.trim() !== "" && (query.trim() !== trimmed || isFetching);

  return {
    query,
    /** the debounced, trimmed query the results belong to */
    trimmed,
    results: data,
    serverError,
    searching,
    setQuery: (next: string) => {
      setQuery(next);
      debounce(next);
    },
    reset: () => {
      setQuery("");
      setDebouncedQuery("");
    },
  };
}
