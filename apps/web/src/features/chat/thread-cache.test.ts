import { describe, expect, test } from "bun:test";

import { appendToThread, newestId, threadMessages, type ThreadData } from "./thread-cache";

const message = (id: number) => ({
  id,
  mine: false,
  body: `m${id}`,
  card: null,
  caution: null,
  createdAt: new Date(id * 1000).toISOString(),
});

const conversation = {
  id: 1,
  partner: {
    userId: "u2",
    user: { name: "rin", image: null, discord: null, twitter: null, displayUsername: null },
    identity: { name: "rin", address: null, also: [] },
  },
  request: false,
  archived: false,
  muted: null,
  lastReadMessageId: null,
} as unknown as ThreadData["pages"][number]["conversation"];

function thread(...pages: number[][]): ThreadData {
  return {
    pages: pages.map((ids) => ({
      conversation,
      messages: ids.map(message),
      hasMore: false,
      collections: {},
    })),
    pageParams: pages.map(() => undefined),
  };
}

describe("threadMessages", () => {
  test("reads older pages first", () => {
    expect(threadMessages(thread([4, 5], [1, 2, 3])).map((m) => m.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("appendToThread", () => {
  test("adds newer messages to the newest page in order", () => {
    const next = appendToThread(thread([4, 5], [1, 2, 3]), {
      messages: [message(6), message(7)],
      collections: {},
    });
    expect(threadMessages(next).map((m) => m.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(newestId(next)).toBe(7);
  });

  test("a repeated or overlapping fetch adds nothing twice", () => {
    const once = appendToThread(thread([1, 2]), { messages: [message(3)], collections: {} });
    const twice = appendToThread(once, {
      messages: [message(2), message(3), message(4)],
      collections: {},
    });
    expect(threadMessages(twice).map((m) => m.id)).toEqual([1, 2, 3, 4]);
  });

  test("an empty thread takes its first message", () => {
    const next = appendToThread(thread([]), { messages: [message(9)], collections: {} });
    expect(threadMessages(next).map((m) => m.id)).toEqual([9]);
  });

  test("nothing new keeps the same object", () => {
    const data = thread([1, 2]);
    expect(appendToThread(data, { messages: [message(2)], collections: {} })).toBe(data);
  });

  test("takes the newer conversation state", () => {
    const muted = { ...conversation, muted: { until: null } };
    const next = appendToThread(thread([1]), {
      messages: [],
      collections: {},
      conversation: muted,
    });
    expect(next.pages[0]?.conversation.muted).toEqual({ until: null });
  });
});
