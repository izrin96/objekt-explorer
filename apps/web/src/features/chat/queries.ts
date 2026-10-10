import type { ChatBox, ConversationCursor } from "@repo/api/schemas/chat";
import { OFFER_VIEWS_LIMIT } from "@repo/api/schemas/offer";
import type { QueryClient } from "@tanstack/react-query";

import { client, orpc } from "@/lib/orpc";
import { isNotFound } from "@/lib/orpc-error";
import { pollUnlessLive } from "@/stores/user-socket";

import {
  appendToThread,
  liveOfferIds,
  markUnsent,
  newestId,
  patchOffers,
  type ThreadData,
  unsentIds,
} from "./thread-cache";

/** Polls only while the live socket is down; focus always refetches. */
export const chatUnreadOptions = (live: boolean) =>
  orpc.chat.unreadCount.queryOptions({
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: pollUnlessLive(live),
  });

/** Requests never reach the badge, so the Requests tab carries their count. */
export const requestCountOptions = () =>
  orpc.chat.requestCount.queryOptions({ staleTime: 0, refetchOnWindowFocus: true });

export const conversationsOptions = (box: ChatBox, q?: string) =>
  orpc.chat.list.infiniteOptions({
    input: (cursor: ConversationCursor | undefined) => ({ box, q, cursor }),
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

/**
 * After an older page loads, which replaces the pages it started from: what arrived or was
 * unsent meanwhile is read again.
 */
export async function resyncThread(queryClient: QueryClient, id: number) {
  await fetchNewer(queryClient, id);
  await syncUnsent(queryClient, id);
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
  // a nudge during the first load is not lost: that page may have been read before it
  const loading = queryClient.getQueryCache().find({ queryKey });
  if (loading?.state.fetchStatus === "fetching") await loading.promise?.catch(() => undefined);
  for (;;) {
    const data = queryClient.getQueryData<ThreadData>(queryKey);
    if (!data) return;
    const result = await client.chat.thread({ id, after: newestId(data) }).catch(() => null);
    if (!result) return;
    queryClient.setQueryData<ThreadData>(queryKey, (old) =>
      old ? withUnsent(id, appendToThread(old, result)) : old,
    );
    if (!result.hasMore) return;
  }
}

/** Unsends heard on the socket, so a response read before one cannot show its message again. */
const unsentHeard = new Map<number, Set<number>>();

const withUnsent = (id: number, data: ThreadData) => {
  const heard = unsentHeard.get(id);
  return heard ? markUnsent(data, heard) : data;
};

/** One message was unsent: it blanks wherever its thread is cached. */
export function applyUnsent(queryClient: QueryClient, id: number, messageId: number) {
  unsentHeard.set(id, (unsentHeard.get(id) ?? new Set()).add(messageId));
  queryClient.setQueryData<ThreadData>(threadOptions(id).queryKey, (old) =>
    old ? markUnsent(old, new Set([messageId])) : old,
  );
}

/**
 * After a reconnect, unsends missed while it was down: only a message's first minutes can be
 * unsent, so the newest page of each cached thread holds them.
 */
export function syncUnsentEverywhere(queryClient: QueryClient) {
  return Promise.all(cachedThreadIds(queryClient).map((id) => syncUnsent(queryClient, id)));
}

async function syncUnsent(queryClient: QueryClient, id: number) {
  const page = await client.chat.thread({ id }).catch(() => null);
  if (!page) return;
  const ids = unsentIds(page);
  if (ids.size === 0) return;
  queryClient.setQueryData<ThreadData>(threadOptions(id).queryKey, (old) =>
    old ? markUnsent(old, ids) : old,
  );
}

const cachedThreadIds = (queryClient: QueryClient) =>
  queryClient
    .getQueryCache()
    .findAll({ queryKey: orpc.chat.thread.key() })
    .flatMap((query) => {
      const id = (query.state.data as ThreadData | undefined)?.pages[0]?.conversation.id;
      return id === undefined ? [] : [id];
    });

/** After a reconnect: every thread still in the cache catches up. */
export function fetchNewerEverywhere(queryClient: QueryClient) {
  return Promise.all(cachedThreadIds(queryClient).map((id) => fetchNewer(queryClient, id)));
}
