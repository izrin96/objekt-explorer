import { describe, expect, test } from "bun:test";

import type { ConversationRow } from "@repo/api/schemas/chat";

import {
  appendLiveMessage,
  boxOf,
  type ChatMessageEvent,
  type ConversationsData,
  dropConversation,
  placeConversation,
} from "./live-message";
import { type ThreadData, threadMessages } from "./thread-cache";

const message = (id: number) => ({
  id,
  mine: false,
  body: `m${id}`,
  card: null,
  caution: null,
  createdAt: new Date(id * 1000).toISOString(),
  unsent: false,
});

const row = (id: number, over: Partial<ConversationRow> = {}) =>
  ({ id, request: false, archived: false, muted: null, unread: true, ...over }) as ConversationRow;

const thread = (...ids: number[]): ThreadData =>
  ({
    pages: [
      {
        conversation: { id: 1, request: true, archived: false, muted: null },
        messages: ids.map(message),
        hasMore: false,
        collections: {},
      },
    ],
    pageParams: [undefined],
  }) as unknown as ThreadData;

const event = (id: number, previousMessageId: number | null, conversation = row(1)) =>
  ({
    type: "chat_message",
    conversationId: 1,
    previousMessageId,
    message: message(id),
    collections,
    conversation,
    unread: 1,
    requests: 0,
  }) as unknown as ChatMessageEvent;

const collections = { a: { slug: "a" } } as unknown as ChatMessageEvent["collections"];

const list = (...pages: number[][]): ConversationsData =>
  ({
    pages: pages.map((ids) => ({
      items: ids.map((id) => row(id)),
      collections: {},
      nextCursor: null,
    })),
    pageParams: pages.map(() => undefined),
  }) as unknown as ConversationsData;

const ids = (data: ConversationsData) => data.pages.flatMap((page) => page.items.map((i) => i.id));

describe("appendLiveMessage", () => {
  const appended = (result: ReturnType<typeof appendLiveMessage>) => {
    if (result.kind !== "appended") throw new Error(result.kind);
    return result.data;
  };

  test("a message that follows the newest one held is appended", () => {
    const next = appended(appendLiveMessage(thread(3, 4), event(5, 4)));
    expect(threadMessages(next).map((m) => m.id)).toEqual([3, 4, 5]);
    expect(next.pages[0]?.collections).toEqual(collections);
  });

  test("two events in order keep their order", () => {
    const next = appended(
      appendLiveMessage(appended(appendLiveMessage(thread(1), event(2, 1))), event(3, 2)),
    );
    expect(threadMessages(next).map((m) => m.id)).toEqual([1, 2, 3]);
  });

  test("a repeated or older message is a duplicate, whatever it followed", () => {
    const data = thread(3, 4, 5);
    expect(appendLiveMessage(data, event(5, 4)).kind).toBe("duplicate");
    expect(appendLiveMessage(data, event(4, 3)).kind).toBe("duplicate");
    expect(appendLiveMessage(data, event(4, 99)).kind).toBe("duplicate");
  });

  test("a message that followed one the thread lacks is a gap, and nothing is appended", () => {
    expect(appendLiveMessage(thread(3, 4), event(6, 5)).kind).toBe("gap");
    expect(appendLiveMessage(thread(3, 4), event(6, null)).kind).toBe("gap");
  });

  test("the first message of a conversation appends to an empty thread", () => {
    const next = appended(appendLiveMessage(thread(), event(1, null)));
    expect(threadMessages(next).map((m) => m.id)).toEqual([1]);
  });

  test("a thread that is empty but not at the start is a gap", () => {
    expect(appendLiveMessage(thread(), event(8, 7)).kind).toBe("gap");
  });

  test("takes the box flags the row reports", () => {
    const next = appended(appendLiveMessage(thread(1), event(2, 1, row(1, { request: false }))));
    expect(next.pages[0]?.conversation.request).toBe(false);
  });
});

describe("boxOf", () => {
  test("archived wins over request, as the list's boxes are exclusive", () => {
    expect(boxOf(row(1))).toBe("inbox");
    expect(boxOf(row(1, { request: true }))).toBe("requests");
    expect(boxOf(row(1, { archived: true }))).toBe("archived");
    expect(boxOf(row(1, { request: true, archived: true }))).toBe("archived");
  });
});

describe("placeConversation", () => {
  test("a row already listed moves to the top once", () => {
    const next = placeConversation(list([5, 6], [7, 8]), row(7), {});
    expect(ids(next)).toEqual([7, 5, 6, 8]);
  });

  test("a row not held yet is added on top", () => {
    expect(ids(placeConversation(list([5, 6]), row(9), {}))).toEqual([9, 5, 6]);
  });

  test("merges the row's collections into the first page", () => {
    const next = placeConversation(list([5]), row(9), collections);
    expect(next.pages[0]?.collections).toEqual(collections);
  });
});

describe("dropConversation", () => {
  test("removes the row wherever it is, and leaves a list without it as it was", () => {
    const data = list([5, 6], [7]);
    expect(ids(dropConversation(data, 7))).toEqual([5, 6]);
    expect(dropConversation(data, 99)).toBe(data);
  });
});
