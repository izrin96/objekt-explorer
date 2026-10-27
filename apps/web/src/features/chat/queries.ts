import {
  CHAT_BOXES,
  type ChatBox,
  type ConversationCursor,
  type InboxShow,
} from "@repo/api/schemas/chat";
import { OFFER_VIEWS_LIMIT } from "@repo/api/schemas/offer";
import { hashKey, type QueryClient } from "@tanstack/react-query";

import { client, orpc } from "@/lib/orpc";
import { isNotFound } from "@/lib/orpc-error";
import { pollUnlessLive } from "@/stores/user-socket";

import {
  appendLiveMessage,
  boxOf,
  type ChatMessageEvent,
  type ConversationsData,
  dropConversation,
  placeConversation,
} from "./live-message";
import {
  appendToThread,
  catchUpDelay,
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

/** Requests add no number to the badge, so the Requests tab carries their count. */
export const requestCountOptions = () =>
  orpc.chat.requestCount.queryOptions({ staleTime: 0, refetchOnWindowFocus: true });

export const requestsUnseenOptions = (live: boolean) =>
  orpc.chat.requestsUnseen.queryOptions({
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: pollUnlessLive(live),
  });

/** The Inbox's Unread and Needs you chips; the lists' events and writes invalidate it. */
export const inboxCountsOptions = () =>
  orpc.chat.inboxCounts.queryOptions({ staleTime: 0, refetchOnWindowFocus: true });

/** `show` stays out of an unfiltered list's input, so its key is the one live events patch. */
export const conversationsOptions = (box: ChatBox, q?: string, show: InboxShow = "all") =>
  orpc.chat.list.infiniteOptions({
    input: (cursor: ConversationCursor | undefined) => ({
      box,
      q,
      cursor,
      ...(show === "all" ? {} : { show }),
    }),
    initialPageParam: undefined as ConversationCursor | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
    meta: { box },
    // typing a search keeps the list on screen until the new results arrive; another box does not
    placeholderData: (previous, previousQuery) =>
      previousQuery?.meta?.box === box ? previous : undefined,
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
  orpc.chat.requestsUnseen.key(),
  orpc.chat.inboxCounts.key(),
] as const;

export function invalidateChatLists(queryClient: QueryClient) {
  return Promise.all(chatListKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

const unfilteredLists = new Set(
  CHAT_BOXES.map((box) => hashKey(conversationsOptions(box).queryKey)),
);

/**
 * A message arrived with its content: it joins the cached thread (which reads again if it
 * missed one before this), its row heads the box it
 * belongs in, and the badges take the server's counts, so nothing is requested. A searched
 * list cannot be patched (it matches by name and card), so it reads again if it is open.
 */
export function applyChatMessage(queryClient: QueryClient, event: ChatMessageEvent) {
  const held = queryClient.getQueryData<ThreadData>(threadOptions(event.conversationId).queryKey);
  const live = held ? appendLiveMessage(held, event) : null;
  if (live?.kind === "appended") {
    queryClient.setQueryData<ThreadData>(
      threadOptions(event.conversationId).queryKey,
      withUnsent(event.conversationId, live.data),
    );
  } else if (live?.kind === "gap" || (!held && threadLoading(queryClient, event.conversationId))) {
    // the missed message and this one come back together; or the first page was read before
    // this message existed, and nothing else would bring it
    void fetchNewer(queryClient, event.conversationId);
  }
  const home = boxOf(event.conversation);
  for (const box of CHAT_BOXES) {
    queryClient.setQueryData<ConversationsData>(conversationsOptions(box).queryKey, (old) => {
      if (!old) return old;
      return box === home
        ? placeConversation(old, event.conversation, event.collections)
        : dropConversation(old, event.conversationId);
    });
  }
  queryClient.setQueryData(orpc.chat.unreadCount.queryKey(), event.unread);
  queryClient.setQueryData(orpc.chat.requestCount.queryKey(), event.requests);
  queryClient.setQueryData(orpc.chat.requestsUnseen.queryKey(), event.requestsUnseen);
  void queryClient.invalidateQueries({ queryKey: orpc.chat.inboxCounts.key() });
  // a filtered list needs the server's predicate to know whether the row still belongs
  void queryClient.invalidateQueries({
    queryKey: orpc.chat.list.key(),
    predicate: (query) => !unfilteredLists.has(hashKey(query.queryKey)),
  });
}

const threadQuery = (queryClient: QueryClient, id: number) =>
  queryClient.getQueryCache().find({ queryKey: threadOptions(id).queryKey });

function threadLoading(queryClient: QueryClient, id: number) {
  const query = threadQuery(queryClient, id);
  return query !== undefined && query.state.data === undefined;
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

/** Threads whose catch-up is failing and being retried, so a second failure does not start another loop. */
const retrying = new Set<number>();

const waitToRetry = (ms: number) =>
  new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener("online", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    window.addEventListener("online", done);
  });

/**
 * Appends what the thread is missing; false when a fetch failed. Callers wait for this, so a
 * failure must not be waited out here: a send or an action stays pending until it returns.
 */
async function pullNewer(queryClient: QueryClient, id: number) {
  const { queryKey } = threadOptions(id);
  for (;;) {
    const data = queryClient.getQueryData<ThreadData>(queryKey);
    if (!data) {
      behind.delete(id);
      return true;
    }
    const result = await client.chat.thread({ id, after: newestId(data) }).catch(() => null);
    if (!result) return false;
    queryClient.setQueryData<ThreadData>(queryKey, (old) =>
      old ? withUnsent(id, appendToThread(old, result)) : old,
    );
    if (!result.hasMore) {
      behind.delete(id);
      return true;
    }
  }
}

const isShown = (queryClient: QueryClient, id: number) =>
  (threadQuery(queryClient, id)?.getObserversCount() ?? 0) > 0;

/** Threads whose catch-up failed while nothing showed them, so showing one again reads what it missed. */
const behind = new Set<number>();

/** Called when a thread is shown: reads what a failed catch-up left behind. */
export function catchUpIfBehind(queryClient: QueryClient, id: number) {
  if (behind.has(id)) void fetchNewer(queryClient, id).catch(() => undefined);
}

/** Retries in the background, with backoff and when the browser comes online, while the thread is shown. */
async function retryNewer(queryClient: QueryClient, id: number) {
  if (retrying.has(id)) return;
  retrying.add(id);
  try {
    for (let attempt = 0; isShown(queryClient, id); attempt++) {
      await waitToRetry(catchUpDelay(attempt));
      if (!isShown(queryClient, id)) break;
      if (await pullNewer(queryClient, id)) return;
    }
    behind.add(id);
  } finally {
    retrying.delete(id);
  }
}

async function appendNewer(queryClient: QueryClient, id: number) {
  // a nudge during the first load is not lost: that page may have been read before it
  const loading = threadQuery(queryClient, id);
  if (loading?.state.fetchStatus === "fetching") await loading.promise?.catch(() => undefined);
  if (!(await pullNewer(queryClient, id))) {
    if (isShown(queryClient, id)) void retryNewer(queryClient, id);
    else behind.add(id);
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
  // the first page may have been read before the unsend; it is marked once it has loaded
  if (threadLoading(queryClient, id)) void fetchNewer(queryClient, id);
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
