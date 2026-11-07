import type { Outputs } from "@repo/api";
import type { ChatBox, ConversationCursor, ConversationRow } from "@repo/api/schemas/chat";
import type { RealtimeEvent } from "@repo/api/schemas/realtime";
import type { InfiniteData } from "@tanstack/react-query";

import { appendToThread, newestId, type ThreadData } from "./thread-cache";

export type ChatMessageEvent = Extract<RealtimeEvent, { type: "chat_message" }>;
export type ConversationsPage = Outputs["chat"]["list"];
export type ConversationsData = InfiniteData<ConversationsPage, ConversationCursor | undefined>;

/** The box the list shows a row in. */
export const boxOf = (row: Pick<ConversationRow, "request" | "archived">): ChatBox =>
  row.archived ? "archived" : row.request ? "requests" : "inbox";

export type LiveAppend =
  | { kind: "appended"; data: ThreadData }
  /** the thread already holds it, or newer: nothing to do */
  | { kind: "duplicate" }
  /** the thread's newest is not the message this one followed: one was missed in between */
  | { kind: "gap" };

/**
 * Adds the message to a cached thread only when it follows the thread's newest, so a message lost
 * between two live ones is fetched rather than skipped for good. Ids only grow, so a replayed
 * or doubled event, or one a refetch already delivered, changes nothing.
 */
export function appendLiveMessage(data: ThreadData, event: ChatMessageEvent): LiveAppend {
  const first = data.pages[0];
  const newest = newestId(data);
  if (!first || event.message.id <= newest) return { kind: "duplicate" };
  // an empty thread's newest is 0, which is what a first message follows
  if ((event.previousMessageId ?? 0) !== newest) return { kind: "gap" };
  const { request, archived, muted } = event.conversation;
  return {
    kind: "appended",
    data: appendToThread(data, {
      messages: [event.message],
      collections: event.collections,
      // sending or replying can accept a request or lift an archive
      conversation: { ...first.conversation, request, archived, muted },
    }),
  };
}

/** The row leaves the list wherever it sits. */
export function dropConversation(data: ConversationsData, id: number): ConversationsData {
  if (!data.pages.some((page) => page.items.some((item) => item.id === id))) return data;
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.items.some((item) => item.id === id)
        ? { ...page, items: page.items.filter((item) => item.id !== id) }
        : page,
    ),
  };
}

/**
 * The row heads the list: a new message makes it the newest activity, so it belongs above
 * everything held, whichever page it was on.
 */
export function placeConversation(
  data: ConversationsData,
  row: ConversationRow,
  collections: ConversationsPage["collections"],
): ConversationsData {
  const [first, ...rest] = dropConversation(data, row.id).pages;
  if (!first) return data;
  return {
    ...data,
    pages: [
      {
        ...first,
        items: [row, ...first.items],
        collections: { ...first.collections, ...collections },
      },
      ...rest,
    ],
  };
}

/**
 * What a tab has applied from live messages: the newest message per conversation, and the newest
 * message whose badge counts it took. Each event is built after its message commits, but two can
 * arrive in either order, so an older one must not overwrite what a newer one set.
 */
export type LiveOrder = { rows: Map<number, number>; counts: number };

export const createLiveOrder = (): LiveOrder => ({ rows: new Map(), counts: 0 });

/**
 * Whether the event's row is newer than what the tab holds for that conversation, read from
 * the events applied and from the cached lists, which a refetch may have moved past both.
 */
export function rowIsFresh(
  order: LiveOrder,
  lists: readonly (ConversationsData | undefined)[],
  row: ConversationRow,
) {
  if (row.last.id <= (order.rows.get(row.id) ?? 0)) return false;
  return !lists.some((data) =>
    data?.pages.some((page) =>
      page.items.some((item) => item.id === row.id && item.last.id >= row.last.id),
    ),
  );
}

/** Records an applied event; returns whether its badge counts are the newest seen. */
export function takeLiveOrder(order: LiveOrder, event: ChatMessageEvent, rowFresh: boolean) {
  const { id } = event.message;
  if (rowFresh) order.rows.set(event.conversationId, id);
  if (id <= order.counts) return false;
  order.counts = id;
  return true;
}
