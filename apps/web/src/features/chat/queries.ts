import {
  CHAT_BOXES,
  type ChatBox,
  type ConversationCursor,
  type InboxShow,
} from "@repo/api/schemas/chat";
import { hashKey, type QueryClient } from "@tanstack/react-query";

import { LOADER_READ_STALE_MS, client, orpc } from "@/lib/orpc";
import { markRepliesUnsent } from "@/stores/chat-draft";
import { pollUnlessLive } from "@/stores/user-socket";

import {
  boxOf,
  type ChatMessageEvent,
  type ConversationsData,
  createLiveOrder,
  dropConversation,
  type LiveOrder,
  placeConversation,
  rowIsFresh,
  takeLiveOrder,
} from "./live-message";
import { type ThreadData, withPartnerRead } from "./thread-cache";
import { createThreadSync, type ThreadSync, type ThreadSyncPort } from "./thread-sync";

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
    staleTime: LOADER_READ_STALE_MS,
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

const livePort: ThreadSyncPort = {
  threadKey: (id) => threadOptions(id).queryKey,
  threadsKey: orpc.chat.thread.key(),
  readThread: (input) => client.chat.thread(input).catch(() => null),
  readOffers: (ids) => client.offer.views({ ids }).catch(() => null),
  waitToRetry,
  unsent: markRepliesUnsent,
};

const syncs = new WeakMap<QueryClient, ThreadSync>();

/** One per QueryClient, so what it remembers about threads goes with the cache that holds them. */
function threadSync(queryClient: QueryClient) {
  let sync = syncs.get(queryClient);
  if (!sync) {
    sync = createThreadSync(queryClient, livePort);
    syncs.set(queryClient, sync);
  }
  return sync;
}

const liveOrders = new WeakMap<QueryClient, LiveOrder>();

function liveOrder(queryClient: QueryClient) {
  let order = liveOrders.get(queryClient);
  if (!order) {
    order = createLiveOrder();
    liveOrders.set(queryClient, order);
  }
  return order;
}

/**
 * A message arrived with its content: it joins the cached thread, its row heads the box it
 * belongs in, and the badges take the server's counts, so nothing is requested. An event older
 * than one already applied changes neither. A searched
 * list cannot be patched (it matches by name and card), so it reads again if it is open.
 */
export function applyChatMessage(queryClient: QueryClient, event: ChatMessageEvent) {
  threadSync(queryClient).message(event);
  const order = liveOrder(queryClient);
  const keys = CHAT_BOXES.map((box) => [box, conversationsOptions(box).queryKey] as const);
  const fresh = rowIsFresh(
    order,
    keys.map(([, key]) => queryClient.getQueryData<ConversationsData>(key)),
    event.conversation,
  );
  if (fresh) {
    const home = boxOf(event.conversation);
    for (const [box, key] of keys) {
      queryClient.setQueryData<ConversationsData>(key, (old) => {
        if (!old) return old;
        return box === home
          ? placeConversation(old, event.conversation, event.collections)
          : dropConversation(old, event.conversationId);
      });
    }
  }
  if (takeLiveOrder(order, event, fresh)) {
    queryClient.setQueryData(orpc.chat.unreadCount.queryKey(), event.unread);
    queryClient.setQueryData(orpc.chat.requestCount.queryKey(), event.requests);
    queryClient.setQueryData(orpc.chat.requestsUnseen.queryKey(), event.requestsUnseen);
  } else if (fresh) {
    // another conversation's message can commit after a higher id was counted, so ask again
    for (const queryKey of [
      orpc.chat.unreadCount.queryKey(),
      orpc.chat.requestCount.queryKey(),
      orpc.chat.requestsUnseen.queryKey(),
    ]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }
  void queryClient.invalidateQueries({ queryKey: orpc.chat.inboxCounts.key() });
  // a filtered list needs the server's predicate to know whether the row still belongs
  void queryClient.invalidateQueries({
    queryKey: orpc.chat.list.key(),
    predicate: (query) => !unfilteredLists.has(hashKey(query.queryKey)),
  });
}

/** The partner's read reached this tab: only a cached thread's Seen moves. */
export function applySeen(queryClient: QueryClient, id: number, upTo: number) {
  queryClient.setQueryData<ThreadData>(threadOptions(id).queryKey, (old) =>
    old ? withPartnerRead(old, upTo) : old,
  );
}

/** Appends what a cached thread is missing, then re-reads its live offers; see `thread-sync.ts`. */
export const fetchNewer = (queryClient: QueryClient, id: number) =>
  threadSync(queryClient).fetchNewer(id);

export const resyncThread = (queryClient: QueryClient, id: number) =>
  threadSync(queryClient).resync(id);

export const catchUpIfBehind = (queryClient: QueryClient, id: number) =>
  threadSync(queryClient).catchUpIfBehind(id);

export const applyUnsent = (queryClient: QueryClient, id: number, messageId: number) =>
  threadSync(queryClient).unsend(id, messageId);

export const fetchNewerEverywhere = (queryClient: QueryClient) =>
  threadSync(queryClient).fetchNewerEverywhere();

export const syncUnsentEverywhere = (queryClient: QueryClient) =>
  threadSync(queryClient).syncUnsentEverywhere();
