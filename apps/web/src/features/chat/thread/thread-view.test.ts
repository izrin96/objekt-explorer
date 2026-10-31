import { describe, expect, test } from "bun:test";

import type { ChatMessage, PostCardView } from "@repo/api/schemas/chat";

import {
  muteWait,
  newDividerAt,
  newestIncomingId,
  openedUnread,
  postOfferOf,
  threadFooter,
  unreadAtOpen,
} from "./thread-view";

const theirs = (id: number) => ({ id, mine: false });
const mine = (id: number) => ({ id, mine: true });
const settled = { olderPages: false, lost: false };

describe("newestIncomingId", () => {
  test("skips own messages", () => {
    expect(newestIncomingId([theirs(1), theirs(2), mine(3)])).toBe(2);
  });

  test("is undefined with none of theirs", () => {
    expect(newestIncomingId([mine(1), mine(2)])).toBeUndefined();
    expect(newestIncomingId([])).toBeUndefined();
  });
});

describe("openedUnread", () => {
  test("reads the last read id and the newest incoming one", () => {
    expect(openedUnread([theirs(4), mine(5)], 2)).toEqual({ lastRead: 2, newest: 4 });
  });

  test("gives zeros for a null last read and no incoming messages", () => {
    expect(openedUnread([mine(1)], null)).toEqual({ lastRead: 0, newest: 0 });
    expect(openedUnread([], undefined)).toEqual({ lastRead: 0, newest: 0 });
  });
});

describe("unreadAtOpen", () => {
  test("is false when nothing is newer than the last read", () => {
    expect(unreadAtOpen({ lastRead: 5, newest: 5 })).toBe(false);
    expect(unreadAtOpen({ lastRead: 6, newest: 5 })).toBe(false);
  });

  test("is true when something is", () => {
    expect(unreadAtOpen({ lastRead: 4, newest: 5 })).toBe(true);
  });
});

describe("newDividerAt", () => {
  test("is undefined with nothing unread", () => {
    const messages = [theirs(1), theirs(2)];
    expect(newDividerAt(messages, { lastRead: 2, newest: 2 }, settled)).toBeUndefined();
  });

  test("skips own messages: the line sits above the first incoming unread one", () => {
    const messages = [theirs(1), mine(2), mine(3), theirs(4), theirs(5)];
    expect(newDividerAt(messages, { lastRead: 1, newest: 5 }, settled)).toBe(4);
  });

  test("a message that arrives after open does not move the line", () => {
    const messages = [theirs(1), theirs(2), mine(3), theirs(4)];
    const opened = openedUnread(messages.slice(0, 3), 2);
    expect(opened).toEqual({ lastRead: 2, newest: 2 });
    expect(newDividerAt(messages, opened, settled)).toBeUndefined();
  });

  test("a later arrival leaves the first unread one in place", () => {
    const opened = openedUnread([theirs(1), theirs(2), theirs(3)], 1);
    const messages = [theirs(1), theirs(2), theirs(3), theirs(4)];
    expect(newDividerAt(messages, opened, settled)).toBe(2);
  });

  test("waits for the message before it while older pages remain", () => {
    const opened = { lastRead: 5, newest: 8 };
    const older = { olderPages: true, lost: false };
    expect(newDividerAt([theirs(6), theirs(7), theirs(8)], opened, older)).toBeUndefined();
    expect(newDividerAt([theirs(5), theirs(6), theirs(7), theirs(8)], opened, older)).toBe(6);
  });

  test("is undefined for an empty list", () => {
    expect(newDividerAt([], { lastRead: 0, newest: 3 }, settled)).toBeUndefined();
    expect(
      newDividerAt([], { lastRead: 0, newest: 3 }, { olderPages: true, lost: false }),
    ).toBeUndefined();
  });

  test("is undefined once lost", () => {
    const messages = [theirs(1), theirs(2)];
    expect(
      newDividerAt(messages, { lastRead: 0, newest: 2 }, { olderPages: false, lost: true }),
    ).toBeUndefined();
  });

  test("never read: the first incoming message, once no older pages remain", () => {
    const messages = [mine(1), theirs(2), theirs(3)];
    const opened = openedUnread(messages, null);
    expect(newDividerAt(messages, opened, settled)).toBe(2);
    expect(newDividerAt(messages, opened, { olderPages: true, lost: false })).toBeUndefined();
  });
});

describe("threadFooter", () => {
  const free = { partnerDeleted: false, sendBlocked: null, blockedByMe: false };
  const mute = { reason: "spam", until: null };

  test("is the composer with no flag set", () => {
    expect(threadFooter(free)).toBe("composer");
  });

  test("each flag alone picks its notice", () => {
    expect(threadFooter({ ...free, partnerDeleted: true })).toBe("deleted");
    expect(threadFooter({ ...free, sendBlocked: mute })).toBe("muted");
    expect(threadFooter({ ...free, blockedByMe: true })).toBe("blocked");
  });

  test("deleted beats muted beats blocked", () => {
    expect(threadFooter({ partnerDeleted: true, sendBlocked: mute, blockedByMe: true })).toBe(
      "deleted",
    );
    expect(threadFooter({ partnerDeleted: false, sendBlocked: mute, blockedByMe: true })).toBe(
      "muted",
    );
  });
});

describe("postOfferOf", () => {
  const side = { slugs: ["a"], more: 0, copyCount: 1 };
  const matchSide = { count: 1, slugs: ["a"] };
  const match = { ownerHas: matchSide, senderHas: matchSide };

  function postCard(owner: string, options: { match?: boolean; has?: boolean } = {}): PostCardView {
    const { match: withMatch = true, has = true } = options;
    return {
      kind: "post",
      listId: 1,
      post: {
        tag: "wtt",
        tags: ["wtt"],
        owner: { userId: owner, name: owner },
        list: { id: 1, slug: "post-slug", name: "Post", profileSlug: null, profile: null },
        has: has ? side : null,
        wants: null,
        price: null,
      },
      match: withMatch ? match : null,
    };
  }

  const objektCard: ChatMessage["card"] = {
    kind: "objekt",
    collectionSlug: "c",
    objektId: null,
    serial: null,
    list: null,
    price: null,
    isQyop: false,
  };

  test("the partner's post with a match adds its matches and starts on its list", () => {
    expect(postOfferOf([{ card: postCard("them") }], "them")).toEqual({
      matches: { partnerId: "them", post: "post-slug" },
      startList: "post-slug",
    });
  });

  test("a post without a have side starts on no list", () => {
    expect(postOfferOf([{ card: postCard("them", { has: false }) }], "them")).toEqual({
      matches: { partnerId: "them", post: "post-slug" },
      startList: undefined,
    });
  });

  test("a newer objekt card hides an older matching post", () => {
    expect(postOfferOf([{ card: postCard("them") }, { card: objektCard }], "them")).toEqual({});
  });

  test("is empty for someone else's post, such as the viewer's own", () => {
    expect(postOfferOf([{ card: postCard("me") }], "them")).toEqual({});
  });

  test("is empty without a match", () => {
    expect(postOfferOf([{ card: postCard("them", { match: false }) }], "them")).toEqual({});
  });

  test("is empty with no cards", () => {
    expect(postOfferOf([], "them")).toEqual({});
    expect(postOfferOf([{ card: null }], "them")).toEqual({});
  });

  test("a message without a card after the post card does not hide it", () => {
    expect(postOfferOf([{ card: postCard("them") }, { card: null }], "them")).toEqual({
      matches: { partnerId: "them", post: "post-slug" },
      startList: "post-slug",
    });
  });
});

describe("muteWait", () => {
  const now = Date.parse("2026-10-31T00:00:00Z");
  const at = (ms: number) => new Date(now + ms).toISOString();
  const DAY = 86_400_000;

  test("no mute, or an unreadable end, waits for nothing", () => {
    expect(muteWait(null, now)).toBeNull();
    expect(muteWait("not a date", now)).toBeNull();
  });

  test("a mute that ended while the thread was cached is read at once", () => {
    expect(muteWait(at(-DAY), now)).toEqual({ ms: 0, refresh: true });
    expect(muteWait(at(0), now)).toEqual({ ms: 0, refresh: true });
  });

  test("a running mute is read a second after it ends", () => {
    expect(muteWait(at(5000), now)).toEqual({ ms: 6000, refresh: true });
  });

  test("an end past setTimeout's reach is waited out in steps", () => {
    expect(muteWait(at(30 * DAY), now)).toEqual({ ms: 2 ** 31 - 1, refresh: false });
  });
});
