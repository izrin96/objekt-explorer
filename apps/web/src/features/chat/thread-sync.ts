import { OFFER_VIEWS_LIMIT } from "@repo/api/schemas/offer";
import { type QueryClient, type QueryKey, noop } from "@tanstack/react-query";

import { appendLiveMessage, type ChatMessageEvent } from "./live-message";
import {
  appendToThread,
  catchUpDelay,
  liveOfferIds,
  markUnsent,
  newestId,
  patchOffers,
  type ThreadData,
  type ThreadPage,
  unsentIds,
} from "./thread-cache";

type OfferViews = Parameters<typeof patchOffers>[1];

/** Everything thread sync reads or reports outside the cache; `queries.ts` holds the live one. */
export type ThreadSyncPort = {
  threadKey: (id: number) => QueryKey;
  /** the prefix of every thread's key */
  threadsKey: QueryKey;
  /** the newest page, or the messages after `after`; null when the read failed */
  readThread: (input: { id: number; after?: number }) => Promise<ThreadPage | null>;
  /** null when the read failed */
  readOffers: (ids: number[]) => Promise<OfferViews | null>;
  /** resolves after `ms`, or sooner when the browser comes back online */
  waitToRetry: (ms: number) => Promise<void>;
  /** messages found unsent, so drafts replying to them blank their quote */
  unsent: (ids: ReadonlySet<number>) => void;
};

export type ThreadSync = ReturnType<typeof createThreadSync>;

/**
 * Keeps every cached thread of one QueryClient in step with the server: newer messages are
 * appended, never refetched, so the cache never goes stale on its own.
 */
export function createThreadSync(queryClient: QueryClient, port: ThreadSyncPort) {
  /** Threads whose catch-up is failing and being retried, so a second failure does not start another loop. */
  const retrying = new Set<number>();
  /** Threads whose catch-up failed while nothing showed them, so showing one again reads what it missed. */
  const behind = new Set<number>();
  /** Unsends heard on the socket, so a response read before one cannot show its message again. */
  const unsentHeard = new Map<number, Set<number>>();

  const threadQuery = (id: number) =>
    queryClient.getQueryCache().find({ queryKey: port.threadKey(id) });
  const cached = (id: number) => queryClient.getQueryData<ThreadData>(port.threadKey(id));
  const isShown = (id: number) => (threadQuery(id)?.getObserversCount() ?? 0) > 0;

  function isLoading(id: number) {
    const query = threadQuery(id);
    return query !== undefined && query.state.data === undefined;
  }

  const withUnsent = (id: number, data: ThreadData) => {
    const heard = unsentHeard.get(id);
    return heard ? markUnsent(data, heard) : data;
  };

  const cachedThreadIds = () =>
    queryClient
      .getQueryCache()
      .findAll({ queryKey: port.threadsKey })
      .flatMap((query) => {
        const id = (query.state.data as ThreadData | undefined)?.pages[0]?.conversation.id;
        return id === undefined ? [] : [id];
      });

  /**
   * Appends what the thread is missing; false when a read failed. Callers wait for this, so a
   * failure must not be waited out here: a send or an action stays pending until it returns.
   */
  async function pullNewer(id: number) {
    for (;;) {
      const data = cached(id);
      if (!data) {
        behind.delete(id);
        return true;
      }
      const result = await port.readThread({ id, after: newestId(data) });
      if (!result) return false;
      queryClient.setQueryData<ThreadData>(port.threadKey(id), (old) =>
        old ? withUnsent(id, appendToThread(old, result)) : old,
      );
      if (!result.hasMore) {
        behind.delete(id);
        return true;
      }
    }
  }

  /** Retries with backoff, and when the browser comes online, while the thread is shown. */
  async function retryNewer(id: number) {
    if (retrying.has(id)) return;
    retrying.add(id);
    try {
      for (let attempt = 0; isShown(id); attempt++) {
        await port.waitToRetry(catchUpDelay(attempt));
        if (!isShown(id)) break;
        if (await pullNewer(id)) return;
      }
      behind.add(id);
    } finally {
      retrying.delete(id);
    }
  }

  async function appendNewer(id: number) {
    // a nudge during the first load is not lost: that page may have been read before it
    const loading = threadQuery(id);
    if (loading?.state.fetchStatus === "fetching") await loading.promise?.catch(noop);
    if (!(await pullNewer(id))) {
      if (isShown(id)) void retryNewer(id);
      else behind.add(id);
    }
  }

  async function refreshOffers(id: number) {
    const data = cached(id);
    const ids = data ? liveOfferIds(data).slice(-OFFER_VIEWS_LIMIT) : [];
    if (ids.length === 0) return;
    const views = await port.readOffers(ids);
    if (!views) return;
    queryClient.setQueryData<ThreadData>(port.threadKey(id), (old) =>
      old ? patchOffers(old, views) : old,
    );
  }

  /**
   * Appends everything after the newest message a cached thread holds, then re-reads the offers
   * still in play, whose cards change with no new message. A no-op when none is cached.
   */
  async function fetchNewer(id: number) {
    await appendNewer(id);
    await refreshOffers(id);
  }

  async function syncUnsent(id: number) {
    const page = await port.readThread({ id });
    if (!page) return;
    const ids = unsentIds(page);
    if (ids.size === 0) return;
    queryClient.setQueryData<ThreadData>(port.threadKey(id), (old) =>
      old ? markUnsent(old, ids) : old,
    );
    port.unsent(ids);
  }

  return {
    fetchNewer,

    /** A message arrived with its content: it joins the cached thread, which reads again if it missed one before it. */
    message(event: ChatMessageEvent) {
      const id = event.conversationId;
      const held = cached(id);
      const live = held ? appendLiveMessage(held, event) : null;
      if (live?.kind === "appended") {
        queryClient.setQueryData<ThreadData>(port.threadKey(id), withUnsent(id, live.data));
      } else if (live?.kind === "gap" || (!held && isLoading(id))) {
        // the missed message and this one come back together; or the first page was read before
        // this message existed, and nothing else would bring it
        void fetchNewer(id);
      }
    },

    /** One message was unsent: it blanks wherever its thread is cached. */
    unsend(id: number, messageId: number) {
      unsentHeard.set(id, (unsentHeard.get(id) ?? new Set()).add(messageId));
      // the first page may have been read before the unsend; it is marked once it has loaded
      if (isLoading(id)) void fetchNewer(id);
      queryClient.setQueryData<ThreadData>(port.threadKey(id), (old) =>
        old ? markUnsent(old, new Set([messageId])) : old,
      );
      port.unsent(new Set([messageId]));
    },

    /** After an older page loads, which replaces the pages it started from: what arrived or was unsent meanwhile is read again. */
    async resync(id: number) {
      await fetchNewer(id);
      await syncUnsent(id);
    },

    /** Called when a thread is shown: reads what a failed catch-up left behind. */
    catchUpIfBehind(id: number) {
      if (behind.has(id)) void fetchNewer(id).catch(() => undefined);
    },

    /** After a reconnect: every thread still in the cache catches up. */
    fetchNewerEverywhere() {
      return Promise.all(cachedThreadIds().map((id) => fetchNewer(id)));
    },

    /**
     * After a reconnect, unsends missed while it was down: only a message's first minutes can be
     * unsent, so the newest page of each cached thread holds them.
     */
    syncUnsentEverywhere() {
      return Promise.all(cachedThreadIds().map((id) => syncUnsent(id)));
    },
  };
}
