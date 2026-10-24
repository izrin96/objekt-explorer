import { describe, expect, test } from "bun:test";

import {
  boxOf,
  cardAllowed,
  cardListAllowed,
  chatIdentity,
  countsTowardBadge,
  hidesSerials,
  holdsMessage,
  isMessageable,
  isUnread,
  type MemberState,
  messageRateDecision,
  muteEnd,
  nextMemberState,
  pairKey,
  rateDecision,
  rowUnread,
  searchPatterns,
  slidingWindow,
  sendVerdict,
  type StartFacts,
  showsActivityTo,
  startFactsOf,
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
  pref: { allow: "anyone" },
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
    const pref = { allow: "nobody" as const };
    expect(startVerdict(facts({ pref }))).toEqual({ ok: false, reason: "not_accepting" });
    expect(isMessageable(pref)).toBe(false);
    expect(isMessageable({ allow: "anyone" })).toBe(true);
    // the setting applies to new conversations only
    expect(startVerdict(facts({ pref, existing: true }))).toEqual({ ok: true });
  });
});

describe("blocks and mutes", () => {
  test("a block reads exactly like a recipient who accepts nobody", () => {
    const nobody = startVerdict(facts({ pref: { allow: "nobody" } }));
    expect(startVerdict(facts({ blocked: true }))).toEqual(nobody);
    expect(sendVerdict({ blocked: true, senderMuted: false })).toEqual(nobody);
  });

  test("a muted sender can neither start nor send", () => {
    expect(startVerdict(facts({ senderMuted: true }))).toEqual({
      ok: false,
      reason: "muted",
      retryAt: undefined,
    });
    expect(sendVerdict({ blocked: true, senderMuted: true })).toEqual({
      ok: false,
      reason: "muted",
    });
    expect(sendVerdict({ blocked: false, senderMuted: false })).toEqual({ ok: true });
  });

  test("a muted start says when the mute ends", () => {
    const muteUntil = new Date("2026-10-13T00:00:00Z");
    expect(startVerdict(facts({ senderMuted: true, muteUntil }))).toEqual({
      ok: false,
      reason: "muted",
      retryAt: muteUntil,
    });
  });

  test("a reopen of a conversation holding a message is allowed, as with Nobody", () => {
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
    const { sender, recipient } = startMembers();
    expect(boxOf(sender)).toBe("inbox");
    expect(boxOf(recipient)).toBe("inbox");
    const opened = nextMemberState(recipient, { type: "incoming", first: true }, NOW_ISO);
    expect(boxOf(opened)).toBe("requests");
    expect(isUnread({ id: 1, senderId: "alice" }, "kaede", null)).toBe(true);
    expect(countsTowardBadge(opened, { id: 1, senderId: "alice" }, "kaede", NOW)).toBe(false);
  });

  test("a first message with a card or an offer goes straight to the Inbox", () => {
    const { recipient } = startMembers();
    const opened = nextMemberState(
      recipient,
      { type: "incoming", first: true, opensWithContent: true },
      NOW_ISO,
    );
    expect(boxOf(opened)).toBe("inbox");
  });

  test("the opener receives a card-less first message as a request", () => {
    const { sender } = startMembers();
    const opened = nextMemberState(sender, { type: "incoming", first: true }, NOW_ISO);
    expect(boxOf(opened)).toBe("requests");
  });

  test("a later message leaves the box alone", () => {
    const { recipient } = startMembers();
    const requested = nextMemberState(recipient, { type: "incoming", first: true }, NOW_ISO);
    expect(boxOf(nextMemberState(requested, { type: "incoming" }, NOW_ISO))).toBe("requests");
  });

  test("a first message without one stays a request", () => {
    const { recipient } = startMembers();
    expect(boxOf(nextMemberState(recipient, { type: "incoming", first: true }, NOW_ISO))).toBe(
      "requests",
    );
  });

  test("accept by reply", () => {
    const { recipient } = startMembers();
    const replied = nextMemberState(recipient, { type: "send", messageId: 2 }, NOW_ISO);
    expect(boxOf(replied)).toBe("inbox");
    expect(replied.lastReadMessageId).toBe(2);
  });

  test("decline archives and stays a request", () => {
    const requested = nextMemberState(
      startMembers().recipient,
      { type: "incoming", first: true },
      NOW_ISO,
    );
    const declined = nextMemberState(requested, { type: "decline" }, NOW_ISO);
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
  test("a list of either member, never a stranger's", () => {
    expect(cardListAllowed({ ownerId: "alice" }, "alice", "rin")).toBe(true);
    expect(cardListAllowed({ ownerId: "rin" }, "alice", "rin")).toBe(true);
    expect(cardListAllowed({ ownerId: "kaede" }, "alice", "rin")).toBe(false);
  });
});

describe("chatIdentity", () => {
  const flags = { isDefault: false, privateProfile: false };
  const main = {
    address: "0xAbc0000000000000000000000000000000000001",
    nickname: "rin.main",
    ...flags,
  };
  const alt = {
    address: "0xAbc0000000000000000000000000000000000002",
    nickname: "rin.alt",
    ...flags,
  };
  const altRef = { address: alt.address.toLowerCase(), nickname: "rin.alt" };
  const mainRef = { address: main.address.toLowerCase(), nickname: "rin.main" };

  test("with no default flagged, the first linked profile heads the conversation", () => {
    expect(chatIdentity("Rin", [main, alt])).toEqual({
      name: "rin.main",
      address: main.address.toLowerCase(),
      nickname: "rin.main",
      also: [altRef],
    });
  });

  test("a flagged second profile heads it, and the first is named as also", () => {
    expect(chatIdentity("Rin", [main, { ...alt, isDefault: true }])).toEqual({
      name: "rin.alt",
      address: alt.address.toLowerCase(),
      nickname: "rin.alt",
      also: [mainRef],
    });
  });

  test("a private other profile is never named as also", () => {
    expect(chatIdentity("Rin", [main, { ...alt, privateProfile: true }]).also).toEqual([]);
  });

  test("a private default still names the account in chat", () => {
    expect(chatIdentity("Rin", [main, { ...alt, isDefault: true, privateProfile: true }])).toEqual({
      name: "rin.alt",
      address: alt.address.toLowerCase(),
      nickname: "rin.alt",
      also: [mainRef],
    });
  });

  test("Hide nickname does not hide the chat name", () => {
    const hidden = { ...main, hideNickname: true };
    expect(chatIdentity("Rin", [hidden]).name).toBe("rin.main");
  });

  test("a profile with no nickname shows its shortened address and links by the full one", () => {
    for (const nickname of [null, main.address]) {
      expect(chatIdentity("Rin", [{ address: main.address, nickname, ...flags }])).toEqual({
        name: "0xabc0…0001",
        address: main.address.toLowerCase(),
        nickname: null,
        also: [],
      });
    }
  });

  test("no linked profile uses the account name", () => {
    expect(chatIdentity("Rin", [])).toEqual({
      name: "Rin",
      address: null,
      nickname: null,
      also: [],
    });
  });
});

describe("Seen and typing", () => {
  const on = { shownShows: true, viewerShows: true, shownRequest: false };

  test("shown when both keep the switch on", () => {
    expect(showsActivityTo(on)).toBe(true);
  });

  test("hidden both ways when either turns it off", () => {
    expect(showsActivityTo({ ...on, shownShows: false })).toBe(false);
    expect(showsActivityTo({ ...on, viewerShows: false })).toBe(false);
  });

  test("hidden while the shown member has not accepted the request", () => {
    expect(showsActivityTo({ ...on, shownRequest: true })).toBe(false);
  });
});

describe("searchPatterns", () => {
  test("wraps the query for a substring match", () => {
    expect(searchPatterns("rin")).toEqual({ name: "%rin%", slug: "%rin%" });
  });

  test("turns runs of spaces into a hyphen for the slug only", () => {
    expect(searchPatterns("SeoYeon  204Z")).toEqual({
      name: "%SeoYeon  204Z%",
      slug: "%seoyeon-204z%",
    });
  });

  test("escapes LIKE wildcards and the escape character", () => {
    expect(searchPatterns("100%_a\\b")).toEqual({
      name: "%100\\%\\_a\\\\b%",
      slug: "%100\\%\\_a\\\\b%",
    });
  });
});

describe("cardAllowed", () => {
  const sender = "0xsender";
  const partner = "0xpartner";
  const members = [sender, partner];

  test("an owned-picker objekt held by the sender", () => {
    expect(
      cardAllowed({ entries: null, objektId: "1", holder: sender, memberAddresses: members }),
    ).toBe(true);
  });

  test("a list-picker or Trade post collection with an entry for it", () => {
    expect(
      cardAllowed({ entries: [{ objektId: null }], holder: null, memberAddresses: members }),
    ).toBe(true);
  });

  test("a person-sheet collection alone", () => {
    expect(cardAllowed({ entries: null, holder: null, memberAddresses: members })).toBe(true);
  });

  test("a Market drawer objekt held by the seller", () => {
    expect(
      cardAllowed({
        entries: [{ objektId: "537" }],
        objektId: "537",
        holder: partner.toUpperCase(),
        memberAddresses: members,
      }),
    ).toBe(true);
  });

  test("a sold objekt now held by a third account", () => {
    expect(
      cardAllowed({
        entries: [{ objektId: "537" }],
        objektId: "537",
        holder: "0xthird",
        memberAddresses: members,
      }),
    ).toBe(false);
  });

  test("a hide-serial list answers for the collection, not for a copy", () => {
    const probe = { entries: [{ objektId: "537" }], objektId: "1", memberAddresses: members };
    expect(cardAllowed({ ...probe, holder: sender })).toBe(false);
    expect(cardAllowed({ ...probe, collectionOnly: true, holder: sender })).toBe(true);
    expect(cardAllowed({ ...probe, collectionOnly: true, holder: "0xthird" })).toBe(false);
  });

  test("a removed entry", () => {
    expect(cardAllowed({ entries: [], holder: null, memberAddresses: members })).toBe(false);
  });

  test("an objekt the list does not hold", () => {
    expect(
      cardAllowed({
        entries: [{ objektId: "2" }],
        objektId: "1",
        holder: sender,
        memberAddresses: members,
      }),
    ).toBe(false);
  });

  test("an any-copy entry accepts a held objekt", () => {
    expect(
      cardAllowed({
        entries: [{ objektId: null }],
        objektId: "1",
        holder: sender,
        memberAddresses: members,
      }),
    ).toBe(true);
  });

  test("an objekt nobody in the conversation holds", () => {
    expect(
      cardAllowed({ entries: null, objektId: "1", holder: null, memberAddresses: members }),
    ).toBe(false);
  });
});

describe("startFactsOf", () => {
  const ctx = {
    senderId: "alice",
    recipientId: "rin",
    senderHasAddress: true,
    pref: { allow: "anyone" as const },
    safety: { blocked: false, mute: null },
  };

  test("reads the block and the mute off the safety", () => {
    const end = new Date("2026-10-08T00:00:00Z");
    const muted = startFactsOf(
      { ...ctx, safety: { blocked: true, mute: { until: end.toISOString() } } },
      false,
      { ok: true },
    );
    expect(muted.blocked).toBe(true);
    expect(muted.senderMuted).toBe(true);
    expect(muted.muteUntil).toEqual(end);
  });

  test("a mute with no end date, or none, has no muteUntil", () => {
    expect(
      startFactsOf({ ...ctx, safety: { blocked: false, mute: { until: null } } }, false, {
        ok: true,
      }),
    ).toMatchObject({ senderMuted: true, muteUntil: undefined });
    expect(startFactsOf(ctx, false, { ok: true })).toMatchObject({
      senderMuted: false,
      muteUntil: undefined,
    });
  });

  test("carries the existing flag and the rate through", () => {
    const rate = { ok: false as const, retryAt: NOW };
    expect(startFactsOf(ctx, true, rate)).toMatchObject({ existing: true, rate });
  });
});

describe("muteEnd", () => {
  test("is the end date, or undefined", () => {
    expect(muteEnd({ until: NOW_ISO })).toEqual(NOW);
    expect(muteEnd({ until: null })).toBeUndefined();
    expect(muteEnd(null)).toBeUndefined();
  });
});

describe("holdsMessage", () => {
  test("a conversation holds a message once its last message id is set", () => {
    expect(holdsMessage(7)).toBe(true);
    expect(holdsMessage(null)).toBe(false);
    expect(holdsMessage(undefined)).toBe(false);
  });
});

describe("hidesSerials", () => {
  const list = { hideSerial: true, ownerId: "alice" };

  test("hides from everyone but the owner", () => {
    expect(hidesSerials(list, "rin")).toBe(true);
    expect(hidesSerials(list, null)).toBe(true);
    expect(hidesSerials(list, "alice")).toBe(false);
  });

  test("a list that shows serials, or no list, hides nothing", () => {
    expect(hidesSerials({ ...list, hideSerial: false }, "rin")).toBe(false);
    expect(hidesSerials(null, "rin")).toBe(false);
    expect(hidesSerials(undefined, "rin")).toBe(false);
  });
});
