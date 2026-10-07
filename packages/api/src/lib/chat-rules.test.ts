import { describe, expect, test } from "bun:test";

import {
  boxOf,
  cardListAllowed,
  chatIdentity,
  countsTowardBadge,
  isMessageable,
  isUnread,
  type MemberState,
  messageRateDecision,
  nextMemberState,
  pairKey,
  rateDecision,
  rowUnread,
  slidingWindow,
  sendVerdict,
  type StartFacts,
  startMembers,
  startVerdict,
  visibleBox,
} from "./chat-rules";

const NOW = new Date("2026-10-07T12:00:00Z");
const NOW_ISO = NOW.toISOString();
const HOUR = 60 * 60 * 1000;
const OLD_ACCOUNT = new Date("2025-01-01T00:00:00Z");
const NEW_ACCOUNT = new Date(NOW.getTime() - 2 * 24 * HOUR);

const facts = (overrides: Partial<StartFacts> = {}): StartFacts => ({
  senderId: "alice",
  recipientId: "rin",
  senderHasAddress: true,
  pref: { allow: "anyone", allowHidden: false },
  hidesOwner: false,
  blocked: false,
  senderMuted: false,
  existing: false,
  rate: { ok: true },
  ...overrides,
});

const fromRin = (id: number) => ({ id, senderId: "rin" });

describe("pairKey", () => {
  test("orders by code point, whichever side starts", () => {
    expect(pairKey("b", "A")).toEqual({ userLow: "A", userHigh: "b" });
    expect(pairKey("A", "b")).toEqual({ userLow: "A", userHigh: "b" });
  });
});

describe("startVerdict", () => {
  test("second start reopens, even past the start limit", () => {
    const limited = { ok: false as const, retryAt: NOW };
    expect(startVerdict(facts({ rate: limited })).ok).toBe(false);
    expect(startVerdict(facts({ rate: limited, existing: true }))).toEqual({ ok: true });
  });

  test("no linked address", () => {
    expect(startVerdict(facts({ senderHasAddress: false }))).toEqual({
      ok: false,
      reason: "no_address",
    });
  });

  test("never with oneself", () => {
    expect(startVerdict(facts({ recipientId: "alice" }))).toEqual({ ok: false, reason: "self" });
  });

  test("recipient allows nobody", () => {
    const pref = { allow: "nobody" as const, allowHidden: true };
    expect(startVerdict(facts({ pref }))).toEqual({ ok: false, reason: "not_accepting" });
    expect(isMessageable(pref, false)).toBe(false);
    // the setting applies to new conversations only
    expect(startVerdict(facts({ pref, existing: true }))).toEqual({ ok: true });
  });

  test("hidden owner, not opted in", () => {
    expect(startVerdict(facts({ hidesOwner: true }))).toEqual({
      ok: false,
      reason: "hidden_owner",
    });
    expect(isMessageable({ allow: "anyone", allowHidden: false }, true)).toBe(false);
  });

  test("a hidden owner reads the same whether or not a conversation already exists", () => {
    const refused = { ok: false, reason: "hidden_owner" } as const;
    expect(startVerdict(facts({ hidesOwner: true, existing: true }))).toEqual(refused);
    expect(startVerdict(facts({ hidesOwner: true, blocked: true }))).toEqual(refused);
    expect(startVerdict(facts({ hidesOwner: true, senderMuted: true }))).toEqual(refused);
    expect(
      startVerdict(facts({ hidesOwner: true, pref: { allow: "nobody", allowHidden: false } })),
    ).toEqual(refused);
  });

  test("hidden owner, opted in", () => {
    const pref = { allow: "anyone" as const, allowHidden: true };
    expect(startVerdict(facts({ hidesOwner: true, pref }))).toEqual({ ok: true });
    expect(isMessageable(pref, true)).toBe(true);
  });
});

describe("blocks and mutes", () => {
  test("a block reads exactly like a recipient who accepts nobody", () => {
    const nobody = startVerdict(facts({ pref: { allow: "nobody", allowHidden: false } }));
    expect(startVerdict(facts({ blocked: true }))).toEqual(nobody);
    expect(sendVerdict({ blocked: true, senderMuted: false })).toEqual(nobody);
  });

  test("a muted sender can neither start nor send", () => {
    expect(startVerdict(facts({ senderMuted: true }))).toEqual({ ok: false, reason: "muted" });
    expect(sendVerdict({ blocked: true, senderMuted: true })).toEqual({
      ok: false,
      reason: "muted",
    });
    expect(sendVerdict({ blocked: false, senderMuted: false })).toEqual({ ok: true });
  });

  test("a reopen without a card is allowed, as with Nobody", () => {
    expect(startVerdict(facts({ blocked: true, existing: true }))).toEqual({ ok: true });
  });

  test("the blocker's Inbox, Requests and badge drop the conversation; Archived keeps it", () => {
    const inbox = { request: false, archivedAt: null, mutedUntil: null, lastReadMessageId: 1 };
    expect(visibleBox(inbox, true)).toBeNull();
    expect(visibleBox({ ...inbox, request: true }, true)).toBeNull();
    expect(visibleBox({ ...inbox, archivedAt: NOW_ISO }, true)).toBe("archived");
    expect(countsTowardBadge(inbox, fromRin(2), "alice", NOW)).toBe(true);
    expect(countsTowardBadge(inbox, fromRin(2), "alice", NOW, true)).toBe(false);
  });
});

describe("requests", () => {
  test("cold message goes to Requests and does not count", () => {
    const { sender, recipient } = startMembers(false);
    expect(boxOf(sender)).toBe("inbox");
    expect(boxOf(recipient)).toBe("requests");
    expect(isUnread({ id: 1, senderId: "alice" }, "kaede", null)).toBe(true);
    expect(countsTowardBadge(recipient, { id: 1, senderId: "alice" }, "kaede", NOW)).toBe(false);
  });

  test("a start with a card goes straight to the Inbox", () => {
    expect(boxOf(startMembers(true).recipient)).toBe("inbox");
  });

  test("accept by reply", () => {
    const { recipient } = startMembers(false);
    const replied = nextMemberState(recipient, { type: "send", messageId: 2 }, NOW_ISO);
    expect(boxOf(replied)).toBe("inbox");
    expect(replied.lastReadMessageId).toBe(2);
  });

  test("decline archives and stays a request", () => {
    const declined = nextMemberState(startMembers(false).recipient, { type: "decline" }, NOW_ISO);
    expect(boxOf(declined)).toBe("archived");
    expect(declined.request).toBe(true);
  });
});

describe("read state", () => {
  const read: MemberState = {
    request: false,
    archivedAt: null,
    mutedUntil: null,
    lastReadMessageId: 5,
  };

  test("archive then new message returns to the Inbox, unread", () => {
    const archived = nextMemberState(read, { type: "archive" }, NOW_ISO);
    expect(boxOf(archived)).toBe("archived");
    const back = nextMemberState(archived, { type: "incoming" }, NOW_ISO);
    expect(boxOf(back)).toBe("inbox");
    expect(countsTowardBadge(back, fromRin(6), "alice", NOW)).toBe(true);
  });

  test("one's own last message is not unread and does not count", () => {
    expect(isUnread({ id: 6, senderId: "alice" }, "alice", 5)).toBe(false);
    expect(countsTowardBadge(read, { id: 6, senderId: "alice" }, "alice", NOW)).toBe(false);
  });

  test("a request row shows no unread mark", () => {
    expect(rowUnread({ request: true, lastReadMessageId: null }, fromRin(1), "alice")).toBe(false);
    expect(rowUnread({ request: false, lastReadMessageId: null }, fromRin(1), "alice")).toBe(true);
  });

  test("reading never moves the mark back", () => {
    expect(nextMemberState(read, { type: "read", messageId: 3 }, NOW_ISO).lastReadMessageId).toBe(
      5,
    );
  });

  test("muted does not count", () => {
    const until = new Date(NOW.getTime() + 8 * HOUR).toISOString();
    const muted = nextMemberState(read, { type: "mute", until }, NOW_ISO);
    expect(countsTowardBadge(read, fromRin(6), "alice", NOW)).toBe(true);
    expect(countsTowardBadge(muted, fromRin(6), "alice", NOW)).toBe(false);
    const always = nextMemberState(read, { type: "mute", until: "infinity" }, NOW_ISO);
    expect(countsTowardBadge(always, fromRin(6), "alice", NOW)).toBe(false);
  });

  test("mute ends", () => {
    const until = new Date(NOW.getTime() + 8 * HOUR).toISOString();
    const muted = nextMemberState(read, { type: "mute", until }, NOW_ISO);
    const later = new Date(NOW.getTime() + 9 * HOUR);
    expect(countsTowardBadge(muted, fromRin(6), "alice", later)).toBe(true);
  });
});

describe("rate limits", () => {
  const starts = (n: number) => Array.from({ length: n }, (_, i) => NOW.getTime() - (i + 1) * HOUR);

  test("new-account start limit", () => {
    expect(rateDecision(starts(4), NEW_ACCOUNT, NOW)).toEqual({ ok: true });
    const sixth = rateDecision(starts(5), NEW_ACCOUNT, NOW);
    // the oldest of the five, 5 hours ago, ages out 19 hours from now
    expect(sixth).toEqual({ ok: false, retryAt: new Date(NOW.getTime() + 19 * HOUR) });
    expect(rateDecision(starts(5), OLD_ACCOUNT, NOW)).toEqual({ ok: true });
  });

  test("an older account gets 20, and starts past 24 hours fall away", () => {
    expect(rateDecision(starts(20), OLD_ACCOUNT, NOW).ok).toBe(false);
    const stale = [...starts(19), NOW.getTime() - 25 * HOUR];
    expect(rateDecision(stale, OLD_ACCOUNT, NOW)).toEqual({ ok: true });
  });

  test("30 messages in any 60 seconds, not per calendar minute", () => {
    const second = 1000;
    // 30 sends in the last 2 seconds of a minute leave no room just after it turns
    const burst = Array.from({ length: 30 }, (_, i) => NOW.getTime() - 2 * second + i * 50);
    const justAfter = new Date(NOW.getTime() + 100);
    expect(messageRateDecision(burst.slice(0, 29), justAfter)).toEqual({ ok: true });
    expect(messageRateDecision(burst, justAfter)).toEqual({
      ok: false,
      retryAt: new Date(burst[0]! + 60 * second),
    });
    // once the oldest leaves the window, one more fits
    expect(messageRateDecision(burst, new Date(burst[0]! + 60 * second + 1))).toEqual({ ok: true });
  });

  test("retryAt is when enough of the window has aged out", () => {
    const sends = [10, 20, 30].map((s) => NOW.getTime() - s * 1000);
    expect(slidingWindow(sends, NOW, 60_000, 2)).toEqual({
      ok: false,
      retryAt: new Date(NOW.getTime() - 20_000 + 60_000),
    });
  });
});

describe("cardListAllowed", () => {
  const list = (ownerId: string, hideUser: boolean, slug = "s1") => ({ ownerId, hideUser, slug });

  test("the sender's own lists, hidden or not", () => {
    expect(cardListAllowed(list("alice", true), "alice", "rin", null)).toBe(true);
    expect(cardListAllowed(list("alice", false), "alice", "rin", null)).toBe(true);
  });

  test("a partner's list that shows its owner", () => {
    expect(cardListAllowed(list("rin", false), "alice", "rin", null)).toBe(true);
  });

  test("a partner's hidden list is refused exactly like a stranger's list", () => {
    const hidden = cardListAllowed(list("rin", true), "alice", "rin", null);
    const stranger = cardListAllowed(list("kaede", false), "alice", "rin", null);
    expect(hidden).toBe(false);
    expect(stranger).toBe(false);
  });

  test("the hidden list the conversation is started from", () => {
    expect(cardListAllowed(list("rin", true, "s1"), "alice", "rin", "s1")).toBe(true);
    expect(cardListAllowed(list("rin", true, "s2"), "alice", "rin", "s1")).toBe(false);
  });
});

describe("chatIdentity", () => {
  const address = (overrides: Partial<Parameters<typeof chatIdentity>[1][number]> = {}) => ({
    address: "0xAbc",
    nickname: "rin.trades",
    hideNickname: false,
    hideUser: false,
    ...overrides,
  });

  test("a shown nickname heads the conversation", () => {
    expect(chatIdentity("Rin", [address()])).toEqual({
      name: "rin.trades",
      address: "0xabc",
      also: [],
    });
  });

  test("an address that hides its owner or its nickname falls back to the account name", () => {
    expect(chatIdentity("Rin", [address({ hideUser: true })]).name).toBe("Rin");
    expect(chatIdentity("Rin", [address({ hideNickname: true })]).name).toBe("Rin");
  });
});
