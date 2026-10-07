import { describe, expect, test } from "bun:test";

import {
  actionRefusal,
  allowedActions,
  anyCopyShortfall,
  cancelRefusal,
  canReport,
  firstSender,
  rateRefusal,
  toReputation,
  type TradeState,
  createEffect,
  effectiveStatus,
  firstItemRefusal,
  itemFlags,
  itemStillHeld,
  itemVerdict,
  type OfferState,
  offerSummary,
  safetyRefusal,
  topupAmount,
  topupPayer,
  validateShape,
} from "./offer-rules";

const NOW = new Date("2026-10-07T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const ME = "me";
const RIN = "rin";

const offer = (overrides: Partial<OfferState> = {}): OfferState => ({
  fromUserId: ME,
  toUserId: RIN,
  status: "open",
  expiresAt: new Date(NOW.getTime() + 7 * DAY).toISOString(),
  ...overrides,
});

const CURRENCIES = new Set(["KRW", "USD"]);
const item = { collectionSlug: "seoyeon-204z", objektId: "537" };

describe("createEffect", () => {
  test("counter: the recipient of the open offer sends one", () => {
    expect(createEffect(offer(), RIN)).toBe("counter");
  });

  test("replace own: the sender of the open offer sends another", () => {
    expect(createEffect(offer(), ME)).toBe("replace");
  });

  test("new: no open offer", () => {
    expect(createEffect(null, ME)).toBe("new");
  });
});

describe("expiry", () => {
  const sentEightDaysAgo = offer({ expiresAt: new Date(NOW.getTime() - DAY).toISOString() });

  test("an open offer past expires_at reads as expired", () => {
    expect(effectiveStatus(sentEightDaysAgo, NOW)).toBe("expired");
    expect(effectiveStatus(offer(), NOW)).toBe("open");
  });

  test("expired has no Accept", () => {
    expect(allowedActions(sentEightDaysAgo, RIN, NOW)).toEqual([]);
    expect(actionRefusal(sentEightDaysAgo, RIN, "accept", NOW)).toBe("expired");
  });

  test("an ended status is kept", () => {
    expect(effectiveStatus(offer({ status: "declined" }), NOW)).toBe("declined");
    expect(actionRefusal(offer({ status: "accepted" }), RIN, "accept", NOW)).toBe("not_open");
  });
});

describe("allowedActions", () => {
  test("the recipient may accept, decline and counter; the sender may withdraw", () => {
    expect(allowedActions(offer(), RIN, NOW)).toEqual(["accept", "decline", "counter"]);
    expect(allowedActions(offer(), ME, NOW)).toEqual(["withdraw"]);
    expect(allowedActions(offer(), "someone", NOW)).toEqual([]);
  });

  test("the sender can't accept their own offer", () => {
    expect(actionRefusal(offer(), ME, "accept", NOW)).toBe("not_allowed");
  });

  test("a muted user may accept but not create", () => {
    expect(allowedActions(offer(), RIN, NOW, { muted: true })).toEqual(["accept", "decline"]);
    expect(actionRefusal(offer(), RIN, "accept", NOW, { muted: true })).toBeNull();
    expect(actionRefusal(offer(), RIN, "counter", NOW, { muted: true })).toBe("muted");
    const facts = { blocked: false, muted: true, tradeBlocked: false, partnerTradeBlocked: false };
    expect(safetyRefusal("send", facts)).toBe("muted");
    expect(safetyRefusal("accept", facts)).toBeNull();
    expect(safetyRefusal("respond", facts)).toBeNull();
  });

  test("a trade block stops every action", () => {
    expect(allowedActions(offer(), RIN, NOW, { tradeBlocked: true })).toEqual([]);
    expect(actionRefusal(offer(), ME, "withdraw", NOW, { tradeBlocked: true })).toBe(
      "trade_blocked",
    );
    const facts = { blocked: false, muted: false, tradeBlocked: true, partnerTradeBlocked: false };
    expect(safetyRefusal("respond", facts)).toBe("trade_blocked");
  });

  test("a block, or a partner's trade block, reads like not accepting", () => {
    const base = { blocked: false, muted: false, tradeBlocked: false, partnerTradeBlocked: false };
    expect(safetyRefusal("send", { ...base, blocked: true })).toBe("not_accepting");
    expect(safetyRefusal("accept", { ...base, blocked: true })).toBe("not_accepting");
    expect(safetyRefusal("respond", { ...base, blocked: true })).toBeNull();
    expect(safetyRefusal("send", { ...base, partnerTradeBlocked: true })).toBe("not_accepting");
    expect(safetyRefusal("send", base)).toBeNull();
  });
});

describe("validateShape", () => {
  test("cash buy is valid", () => {
    const shape = validateShape(
      { give: [], get: [item], topup: { amount: 6000, currency: "krw", payer: "from" } },
      CURRENCIES,
    );
    expect(shape).toEqual({
      ok: true,
      topup: { amount: "6000.00", currency: "KRW", payer: "from" },
    });
  });

  test("an empty offer is refused", () => {
    expect(validateShape({ give: [], get: [] }, CURRENCIES)).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  test("a top-up alone is still empty", () => {
    const shape = validateShape(
      { give: [], get: [], topup: { amount: 1000, currency: "KRW", payer: "from" } },
      CURRENCIES,
    );
    expect(shape).toEqual({ ok: false, reason: "empty" });
  });

  test("11 objekts on one side are refused, 10 pass", () => {
    const eleven = Array.from({ length: 11 }, () => item);
    expect(validateShape({ give: eleven, get: [] }, CURRENCIES)).toEqual({
      ok: false,
      reason: "too_many",
    });
    expect(validateShape({ give: [], get: eleven }, CURRENCIES)).toEqual({
      ok: false,
      reason: "too_many",
    });
    expect(validateShape({ give: eleven.slice(1), get: eleven.slice(1) }, CURRENCIES).ok).toBe(
      true,
    );
  });

  test("a top-up must be positive, in cents, and in a known currency", () => {
    const shape = (amount: number, currency = "USD") =>
      validateShape(
        { give: [item], get: [], topup: { amount, currency, payer: "to" } },
        CURRENCIES,
      );
    expect(shape(0)).toEqual({ ok: false, reason: "invalid_topup" });
    expect(shape(-5)).toEqual({ ok: false, reason: "invalid_topup" });
    expect(shape(1.234)).toEqual({ ok: false, reason: "invalid_topup" });
    expect(shape(Number.NaN)).toEqual({ ok: false, reason: "invalid_topup" });
    expect(shape(10, "XYZ")).toEqual({ ok: false, reason: "invalid_topup" });
    expect(shape(19.99)).toEqual({
      ok: true,
      topup: { amount: "19.99", currency: "USD", payer: "to" },
    });
  });
});

describe("topupAmount", () => {
  test("rounds float noise but not real fractions of a cent", () => {
    expect(topupAmount(0.1 + 0.2)).toBe("0.30");
    expect(topupAmount(1_000)).toBe("1000.00");
    expect(topupAmount(10_000_000_000)).toBeNull();
  });
});

describe("item checks", () => {
  const mine = new Set(["0xaaa"]);

  test("verdicts: owned elsewhere, not transferable, reserved", () => {
    expect(itemVerdict(undefined, mine, false)).toBe("not_owned");
    expect(itemVerdict({ owner: "0xBBB", transferable: true }, mine, false)).toBe("not_owned");
    expect(itemVerdict({ owner: "0xAAA", transferable: false }, mine, false)).toBe(
      "not_transferable",
    );
    expect(itemVerdict({ owner: "0xaaa", transferable: true }, mine, true)).toBe("reserved");
    expect(itemVerdict({ owner: "0xaaa", transferable: true }, mine, false)).toBe("ok");
  });

  test("the first refusal names every objekt it applies to", () => {
    expect(
      firstItemRefusal([
        { objektId: "1", verdict: "reserved" },
        { objektId: "2", verdict: "not_transferable" },
        { objektId: "3", verdict: "not_transferable" },
        { objektId: "4", verdict: "ok" },
      ]),
    ).toEqual({ reason: "not_transferable", objektIds: ["2", "3"] });
    expect(firstItemRefusal([{ objektId: "4", verdict: "ok" }])).toBeNull();
  });

  test("already offered elsewhere is a warning that leaves out this conversation", () => {
    const open = new Map([
      [
        "88",
        [
          { offerId: 874, conversationId: 5 },
          { offerId: 881, conversationId: 9 },
        ],
      ],
    ]);
    expect(itemFlags({ id: "88", transferable: true }, new Set(), open, 9)).toEqual({
      transferable: true,
      reserved: false,
      inOpenOffer: [874],
    });
    expect(itemFlags({ id: "14", transferable: false }, new Set(["14"]), open, null)).toEqual({
      transferable: false,
      reserved: true,
      inOpenOffer: [],
    });
  });

  test("any copy needs as many spare copies as asked for", () => {
    const wanted = [
      { collectionSlug: "a" },
      { collectionSlug: "a" },
      { collectionSlug: "b" },
      { collectionSlug: "c", objektId: "7" },
    ];
    expect(
      anyCopyShortfall(
        wanted,
        new Map([
          ["a", 2],
          ["b", 1],
        ]),
      ),
    ).toEqual([]);
    expect(
      anyCopyShortfall(
        wanted,
        new Map([
          ["a", 1],
          ["b", 1],
        ]),
      ),
    ).toEqual(["a"]);
    expect(anyCopyShortfall(wanted, new Map())).toEqual(["a", "b"]);
  });
});

describe("offerSummary", () => {
  const items = [
    { side: "give" as const, objektId: "1203" },
    { side: "get" as const, objektId: "537" },
  ];

  test("sides are relative to the viewer", () => {
    expect(offerSummary(items, true)).toEqual({ give: [items[0]!], get: [items[1]!] });
    expect(offerSummary(items, false)).toEqual({ give: [items[1]!], get: [items[0]!] });
  });

  test("the payer is relative to the viewer", () => {
    expect(topupPayer("from", true)).toBe("you");
    expect(topupPayer("from", false)).toBe("them");
    expect(topupPayer("to", false)).toBe("you");
  });
});

describe("firstSender", () => {
  const party = (userId: string, verified: number, createdAt: string) => ({
    userId,
    verified,
    createdAt,
  });

  test("fewer verified trades sends first", () => {
    const binary = party("binary", 31, "2024-01-01T00:00:00Z");
    const user = party("user", 2, "2023-01-01T00:00:00Z");
    expect(firstSender(binary, user)).toBe("user");
    expect(firstSender(user, binary)).toBe("user");
  });

  test("a tie goes to the newer account, then to user_b", () => {
    const older = party("older", 3, "2024-01-01T00:00:00Z");
    const newer = party("newer", 3, "2025-03-01T00:00:00Z");
    expect(firstSender(older, newer)).toBe("newer");
    expect(firstSender(newer, older)).toBe("newer");
    const twin = party("twin", 3, "2024-01-01T00:00:00Z");
    expect(firstSender(older, twin)).toBe("twin");
  });
});

describe("trade rules", () => {
  const trade = (overrides: Partial<TradeState> = {}): TradeState => ({
    status: "in_progress",
    acceptedAt: new Date(NOW.getTime() - DAY).toISOString(),
    endedAt: null,
    verifiedLegs: 0,
    ...overrides,
  });

  test("canReport from 7 days in progress, and at once when failed", () => {
    expect(canReport(trade(), NOW)).toBe(false);
    const week = new Date(NOW.getTime() - 7 * DAY).toISOString();
    expect(canReport(trade({ acceptedAt: week }), NOW)).toBe(true);
    expect(canReport(trade({ status: "failed" }), NOW)).toBe(true);
    expect(canReport(trade({ status: "completed", acceptedAt: week }), NOW)).toBe(false);
  });

  test("cancelling locks after the first verified leg", () => {
    expect(cancelRefusal(trade())).toBeNull();
    expect(cancelRefusal(trade({ verifiedLegs: 1 }))).toBe("locked");
    expect(cancelRefusal(trade({ status: "cancelled" }))).toBe("trade_ended");
  });

  test("feedback only on a completed trade, for 14 days", () => {
    expect(rateRefusal(trade(), NOW)).toBe("not_completed");
    const ended = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
    expect(rateRefusal(trade({ status: "completed", endedAt: ended(13) }), NOW)).toBeNull();
    expect(rateRefusal(trade({ status: "completed", endedAt: ended(15) }), NOW)).toBe(
      "rating_closed",
    );
  });
});

describe("toReputation", () => {
  test("the positive share leaves neutral out and rounds", () => {
    expect(toReputation({ verified: 31, positive: 31, negative: 0, since: "2025-03" })).toEqual({
      verified: 31,
      positive: 100,
      since: "2025-03",
    });
    expect(toReputation({ verified: 3, positive: 2, negative: 1, since: "2025-03" }).positive).toBe(
      67,
    );
  });

  test("no share until a positive or negative rating", () => {
    expect(toReputation({ verified: 2, positive: 0, negative: 0, since: "2025-03" }).positive).toBe(
      null,
    );
  });
});

describe("itemStillHeld", () => {
  const item = {
    objektId: "1",
    holders: ["0xgiver"],
    receivers: ["0xreceiver"],
    since: "2026-10-05T00:00:00.000Z",
  };
  const send = (overrides: Partial<{ from: string; to: string; timestamp: string }> = {}) => ({
    objektId: "1",
    from: "0xGIVER",
    to: "0xreceiver",
    timestamp: "2026-10-06T00:00:00.000Z",
    ...overrides,
  });

  test("still with the giver", () => {
    expect(itemStillHeld(item, "0xGiver", [])).toBe(true);
  });

  test("the giver sent it to the receiver after the offer: an early send, not a move", () => {
    expect(itemStillHeld(item, "0xreceiver", [send()])).toBe(true);
  });

  test("in the receiver's wallet by any other route, or before the offer, it moved", () => {
    expect(itemStillHeld(item, "0xreceiver", [])).toBe(false);
    expect(itemStillHeld(item, "0xreceiver", [send({ from: "0xstranger" })])).toBe(false);
    expect(
      itemStillHeld(item, "0xreceiver", [send({ timestamp: "2026-10-04T00:00:00.000Z" })]),
    ).toBe(false);
  });

  test("anywhere else, or unknown to the indexer, it moved", () => {
    expect(itemStillHeld(item, "0xstranger", [send({ to: "0xstranger" })])).toBe(false);
    expect(itemStillHeld(item, undefined, [])).toBe(false);
  });
});
