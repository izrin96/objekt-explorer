import { describe, expect, test } from "bun:test";

import { OFFER_VIEWS_LIMIT } from "@repo/api/schemas/offer";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { fromPartial } from "@total-typescript/shoehorn";

import type { ChatMessageEvent } from "./live-message";
import { threadMessages, type ThreadData, type ThreadPage } from "./thread-cache";
import { createThreadSync } from "./thread-sync";

type Message = ThreadPage["messages"][number];
type Offer = NonNullable<Message["offer"]>;

const withOffer = (id: number, offer: Pick<Offer, "id" | "status" | "tradeStatus">) =>
  message(id, { offer: fromPartial<Offer>(offer) });

const message = (id: number, over: Partial<Message> = {}): Message =>
  fromPartial({
    id,
    mine: false,
    body: `m${id}`,
    card: null,
    caution: null,
    createdAt: new Date(id * 1000).toISOString(),
    unsent: false,
    replyTo: null,
    offer: null,
    ...over,
  });

const page = (id: number, messages: Message[]): ThreadPage =>
  fromPartial({
    conversation: { id, request: false, archived: false, muted: null },
    messages,
    hasMore: false,
    collections: {},
  });

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

/** A server holding each conversation's messages, behind the port thread sync reads through. */
function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const server = new Map<number, Message[]>();
  const reads: { id: number; after?: number }[] = [];
  const offerReads: number[][] = [];
  const waits: (() => void)[] = [];
  const reported: number[][] = [];
  let failing = 0;
  let gate: Promise<void> | null = null;

  const threadKey = (id: number) => ["thread", id];
  const sync = createThreadSync(queryClient, {
    threadKey,
    threadsKey: ["thread"],
    async readThread(input) {
      reads.push(input);
      if (gate) await gate;
      if (failing > 0) {
        failing--;
        return null;
      }
      const all = server.get(input.id) ?? [];
      const after = input.after;
      return page(input.id, after === undefined ? all : all.filter((m) => m.id > after));
    },
    async readOffers(ids) {
      offerReads.push(ids);
      return fromPartial({
        offers: ids.map((id) => ({ id, status: "accepted", tradeStatus: "completed" })),
        collections: {},
      });
    },
    waitToRetry: () => new Promise<void>((resolve) => waits.push(resolve)),
    unsent: (ids) => reported.push([...ids]),
  });

  const ids = (id: number) => {
    const data = queryClient.getQueryData<ThreadData>(threadKey(id));
    return data ? threadMessages(data).map((m) => (m.unsent ? -m.id : m.id)) : null;
  };

  return {
    queryClient,
    sync,
    server,
    reads,
    offerReads,
    waits,
    reported,
    ids,
    fail: (times: number) => {
      failing = times;
    },
    /** holds every read until the returned function runs */
    hold: () => {
      let open = () => {};
      gate = new Promise<void>((resolve) => {
        open = () => {
          gate = null;
          resolve();
        };
      });
      return open;
    },
    seed: (id: number, messages: Message[]) =>
      queryClient.setQueryData<ThreadData>(threadKey(id), {
        pages: [page(id, messages)],
        pageParams: [undefined],
      }),
    /** the thread's first load, answered by `answer` */
    firstLoad: (id: number) => {
      let answer: (messages: Message[]) => void = () => {};
      const loaded = new Promise<ThreadPage>((resolve) => {
        answer = (messages) => resolve(page(id, messages));
      });
      void queryClient.prefetchInfiniteQuery({
        queryKey: threadKey(id),
        queryFn: () => loaded,
        initialPageParam: undefined as number | undefined,
      });
      return answer;
    },
    /** a thread on screen, until the returned function hides it */
    show: (id: number) =>
      new InfiniteQueryObserver(queryClient, {
        queryKey: threadKey(id),
        queryFn: () => page(id, []),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: () => undefined,
        enabled: false,
      }).subscribe(() => {}),
  };
}

const event = (id: number, m: Message, previousMessageId: number | null): ChatMessageEvent =>
  fromPartial({
    type: "chat_message",
    conversationId: id,
    message: m,
    previousMessageId,
    collections: {},
    conversation: { id, request: false, archived: false, muted: null },
  });

describe("live messages", () => {
  test("the next message joins the thread without a read", () => {
    const t = setup();
    t.seed(1, [message(1), message(2)]);
    t.sync.message(event(1, message(3), 2));
    expect(t.ids(1)).toEqual([1, 2, 3]);
    expect(t.reads).toEqual([]);
  });

  test("after a gap, the missed message and this one are read together", async () => {
    const t = setup();
    t.seed(1, [message(1), message(2)]);
    t.server.set(
      1,
      [1, 2, 3, 4].map((id) => message(id)),
    );
    t.sync.message(event(1, message(4), 3));
    await settle();
    expect(t.ids(1)).toEqual([1, 2, 3, 4]);
    expect(t.reads).toEqual([{ id: 1, after: 2 }]);
  });

  test("a message during the first load is read once that page arrives", async () => {
    const t = setup();
    const answer = t.firstLoad(1);
    t.server.set(
      1,
      [1, 2, 3].map((id) => message(id)),
    );
    t.sync.message(event(1, message(3), 2));
    // the page was read before message 3 existed
    answer([message(1), message(2)]);
    await settle();
    expect(t.ids(1)).toEqual([1, 2, 3]);
  });

  test("an uncached thread that is not loading is left alone", async () => {
    const t = setup();
    t.sync.message(event(1, message(3), 2));
    await settle();
    expect(t.reads).toEqual([]);
  });
});

describe("unsends", () => {
  test("an unsend during the first load blanks the message once the page arrives", async () => {
    const t = setup();
    const answer = t.firstLoad(1);
    t.server.set(1, [message(1), message(2, { unsent: true })]);
    t.sync.unsend(1, 2);
    answer([message(1), message(2)]);
    await settle();
    expect(t.ids(1)).toEqual([1, -2]);
    expect(t.reported).toEqual([[2]]);
  });

  test("a read answered before the unsend cannot bring the message back", async () => {
    const t = setup();
    t.seed(1, [message(1)]);
    t.server.set(1, [message(1), message(2)]);
    const open = t.hold();
    const read = t.sync.fetchNewer(1);
    t.sync.unsend(1, 2);
    open();
    await read;
    expect(t.ids(1)).toEqual([1, -2]);
  });
});

describe("a failed catch-up", () => {
  test("retries while the thread is shown, one loop however often it fails", async () => {
    const t = setup();
    t.seed(1, [message(1)]);
    t.server.set(1, [message(1), message(2)]);
    const hide = t.show(1);
    t.fail(2);
    await t.sync.fetchNewer(1);
    await t.sync.fetchNewer(1);
    expect(t.waits).toHaveLength(1);
    t.waits[0]!();
    await settle();
    expect(t.ids(1)).toEqual([1, 2]);
    hide();
  });

  test("stops when the thread is hidden, and catches up when it is shown again", async () => {
    const t = setup();
    t.seed(1, [message(1)]);
    t.server.set(1, [message(1), message(2)]);
    const hide = t.show(1);
    t.fail(1);
    await t.sync.fetchNewer(1);
    hide();
    t.waits[0]!();
    await settle();
    expect(t.reads).toHaveLength(1);
    expect(t.ids(1)).toEqual([1]);

    const hideAgain = t.show(1);
    t.sync.catchUpIfBehind(1);
    await settle();
    expect(t.ids(1)).toEqual([1, 2]);
    hideAgain();
  });

  test("while hidden, the thread is behind until it is shown", async () => {
    const t = setup();
    t.seed(1, [message(1)]);
    t.server.set(1, [message(1), message(2)]);
    t.fail(1);
    await t.sync.fetchNewer(1);
    expect(t.waits).toHaveLength(0);
    t.sync.catchUpIfBehind(1);
    await settle();
    expect(t.ids(1)).toEqual([1, 2]);

    // caught up: showing it again reads nothing
    const before = t.reads.length;
    t.sync.catchUpIfBehind(1);
    await settle();
    expect(t.reads).toHaveLength(before);
  });
});

test("a reconnect catches up every cached thread and replays its unsends", async () => {
  const t = setup();
  t.seed(1, [message(1)]);
  t.seed(2, [message(5)]);
  t.server.set(1, [message(1), message(2)]);
  t.server.set(2, [message(5, { unsent: true }), message(6)]);
  await t.sync.fetchNewerEverywhere();
  await t.sync.syncUnsentEverywhere();
  expect(t.ids(1)).toEqual([1, 2]);
  expect(t.ids(2)).toEqual([-5, 6]);
  expect(t.reported).toEqual([[5]]);
});

test("the offer refresh re-reads only live offers, the newest up to the limit", async () => {
  const t = setup();
  const messages = [
    withOffer(1, { id: 900, status: "declined", tradeStatus: null }),
    withOffer(2, { id: 901, status: "accepted", tradeStatus: "in_progress" }),
    ...Array.from({ length: OFFER_VIEWS_LIMIT }, (_, i) =>
      withOffer(3 + i, { id: 1000 + i, status: "open", tradeStatus: null }),
    ),
  ];
  t.seed(1, messages);
  t.server.set(1, messages);
  await t.sync.fetchNewer(1);
  expect(t.offerReads).toHaveLength(1);
  const asked = t.offerReads[0]!;
  expect(asked).toHaveLength(OFFER_VIEWS_LIMIT);
  expect(asked).not.toContain(900);
  expect(asked.at(-1)).toBe(1000 + OFFER_VIEWS_LIMIT - 1);
  const data = t.queryClient.getQueryData<ThreadData>(["thread", 1])!;
  expect(threadMessages(data).at(-1)?.offer?.status).toBe("accepted");
});
