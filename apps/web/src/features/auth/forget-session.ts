import type { QueryClient } from "@tanstack/react-query";

import { useChatDraft } from "@/stores/chat-draft";

/**
 * After the viewer changes, drop what the last one could read. Loaders read with
 * `staleTime: "static"`, so a plain invalidation would keep an inactive thread's data for the
 * next account; the queries still mounted refetch.
 */
export async function forgetSession(queryClient: QueryClient) {
  useChatDraft.setState({ cards: {}, drafts: {} });
  queryClient.removeQueries({ type: "inactive" });
  await queryClient.invalidateQueries();
}
