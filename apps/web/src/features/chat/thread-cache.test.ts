import { describe, expect, test } from "bun:test";

import type { OfferView } from "@repo/api/schemas/offer";

import {
  appendToThread,
  latestOfferId,
  liveOfferIds,
  newestId,
  patchOffers,
  threadMessages,
  type ThreadData,
} from "./thread-cache";

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

const withOffer = (
  id: number,
  offer: { status: string; tradeStatus: string | null } | null,
): ThreadData["pages"][number]["messages"][number] =>
  ({
    ...message(id),
    body: null,
    offer: offer ? { id: id * 10, ...offer } : null,
  }) as unknown as ThreadData["pages"][number]["messages"][number];

function offerThread(...messages: ThreadData["pages"][number]["messages"]): ThreadData {
  return {
    pages: [{ conversation, messages, hasMore: false, collections: {} }],
    pageParams: [undefined],
  };
}

describe("liveOfferIds", () => {
  test("an open offer or a trade in progress is live", () => {
    expect(
      liveOfferIds(
        offerThread(
          withOffer(1, { status: "open", tradeStatus: null }),
          withOffer(2, { status: "accepted", tradeStatus: "in_progress" }),
        ),
      ),
    ).toEqual([10, 20]);
  });

  test("ended offers and plain messages are not", () => {
    expect(
      liveOfferIds(
        offerThread(
          withOffer(1, { status: "declined", tradeStatus: null }),
          withOffer(2, { status: "accepted", tradeStatus: "completed" }),
          withOffer(3, null),
        ),
      ),
    ).toEqual([]);
  });
});

describe("patchOffers", () => {
  test("swaps in fresh views across pages and keeps every message", () => {
    const data: ThreadData = {
      pages: [
        {
          conversation,
          messages: [withOffer(3, { status: "open", tradeStatus: null })],
          hasMore: true,
          collections: {},
        },
        {
          conversation,
          messages: [withOffer(1, { status: "open", tradeStatus: null }), withOffer(2, null)],
          hasMore: false,
          collections: {},
        },
      ],
      pageParams: [undefined, 3],
    };
    const fresh = { id: 10, status: "countered", tradeStatus: null } as unknown as OfferView;
    const next = patchOffers(data, { offers: [fresh], collections: { a: {} as never } });
    expect(next.pages[1]!.messages[0]!.offer).toBe(fresh);
    expect(next.pages[0]!.messages[0]!.offer?.status).toBe("open");
    expect(threadMessages(next).map((m) => m.id)).toEqual([1, 2, 3]);
    expect(Object.keys(next.pages[0]!.collections)).toEqual(["a"]);
    expect(next.pageParams).toEqual([undefined, 3]);
  });

  test("returns the same data when there is nothing to swap", () => {
    const data = offerThread(withOffer(1, null));
    expect(patchOffers(data, { offers: [], collections: {} })).toBe(data);
  });
});

describe("latestOfferId", () => {
  test("is the newest offer message's offer", () => {
    const messages = [
      withOffer(1, { status: "countered", tradeStatus: null }),
      withOffer(2, { status: "open", tradeStatus: null }),
      withOffer(3, null),
    ];
    expect(latestOfferId(messages)).toBe(20);
    expect(latestOfferId([withOffer(3, null)])).toBeNull();
  });
});
