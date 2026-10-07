import { ORPCError } from "@orpc/client";
import type { ChatBox, ConversationCursor } from "@repo/api/schemas/chat";
import { OFFER_VIEWS_LIMIT } from "@repo/api/schemas/offer";
import type { QueryClient } from "@tanstack/react-query";

import { client, orpc } from "@/lib/orpc";

import {
  appendToThread,
  liveOfferIds,
  newestId,
  patchOffers,
  type ThreadData,
} from "./thread-cache";

const POLL_MS = 60_000;

export const isNotFound = (error: unknown) =>
  error instanceof ORPCError && error.code === "NOT_FOUND";

/** Polls only while the live socket is down; focus always refetches. */
export const chatUnreadOptions = (live: boolean) =>
  orpc.chat.unreadCount.queryOptions({
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: live ? false : POLL_MS,
  });

/** Requests never reach the badge, so the Requests tab carries their count. */
export const requestCountOptions = () =>
  orpc.chat.requestCount.queryOptions({ staleTime: 0, refetchOnWindowFocus: true });

export const conversationsOptions = (box: ChatBox) =>
  orpc.chat.list.infiniteOptions({
    input: (cursor: ConversationCursor | undefined) => ({ box, cursor }),
    initialPageParam: undefined as ConversationCursor | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
  });

/**
 * Older pages load with `before`; newer messages are appended by `fetchNewer`, never by a
 * refetch, so the cache never goes stale on its own.
 */
export const threadOptions = (id: number) =>
  orpc.chat.thread.infiniteOptions({
    input: (before: number | undefined) => ({ id, before }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (page) => (page.hasMore ? page.messages[0]?.id : undefined),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: (count, error) => !isNotFound(error) && count < 2,
  });

export const chatSettingsOptions = () => orpc.chat.settings.queryOptions({ staleTime: 0 });

const chatListKeys = [
  orpc.chat.list.key(),
  orpc.chat.unreadCount.key(),
  orpc.chat.requestCount.key(),
] as const;

export function invalidateChatLists(queryClient: QueryClient) {
  return Promise.all(chatListKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

/**
 * Appends everything after the newest message a cached thread holds, then re-reads the offers
 * still in play, whose cards change with no new message. A no-op when none is cached.
 */
export async function fetchNewer(queryClient: QueryClient, id: number) {
  await appendNewer(queryClient, id);
  await refreshOffers(queryClient, id);
}

async function refreshOffers(queryClient: QueryClient, id: number) {
  const { queryKey } = threadOptions(id);
  const data = queryClient.getQueryData<ThreadData>(queryKey);
  const ids = data ? liveOfferIds(data).slice(-OFFER_VIEWS_LIMIT) : [];
  if (ids.length === 0) return;
  const views = await client.offer.views({ ids }).catch(() => null);
  if (!views) return;
  queryClient.setQueryData<ThreadData>(queryKey, (old) => (old ? patchOffers(old, views) : old));
}

async function appendNewer(queryClient: QueryClient, id: number) {
  const { queryKey } = threadOptions(id);
  for (;;) {
    const data = queryClient.getQueryData<ThreadData>(queryKey);
    if (!data) return;
    const result = await client.chat.thread({ id, after: newestId(data) }).catch(() => null);
    if (!result) return;
    queryClient.setQueryData<ThreadData>(queryKey, (old) =>
      old ? appendToThread(old, result) : old,
    );
    if (!result.hasMore) return;
  }
}

/** After a reconnect: every thread still in the cache catches up. */
export function fetchNewerEverywhere(queryClient: QueryClient) {
  const ids = queryClient
    .getQueryCache()
    .findAll({ queryKey: orpc.chat.thread.key() })
    .flatMap((query) => {
      const id = (query.state.data as ThreadData | undefined)?.pages[0]?.conversation.id;
      return id === undefined ? [] : [id];
    });
  return Promise.all(ids.map((id) => fetchNewer(queryClient, id)));
}
