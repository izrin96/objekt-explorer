import { describe, expect, test } from "bun:test";

import {
  type CandidateItem,
  createOfferInputSchema,
  OFFER_NOTE_MAX_LENGTH,
  OFFER_SIDE_LIMIT,
  TOPUP_MAX,
} from "@repo/api/schemas/offer";

import type { OfferPick } from "@/features/offers/pick";
import { takeOut } from "@/features/offers/quantity";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import {
  asksOf,
  holdsDraft,
  initialTopup,
  offerInput,
  pickEstimated,
  pickFlags,
  pickProblem,
  resolveAsks,
  sendGate,
  toggleTopup,
  topupForNear,
  topupRestored,
  topupValue,
  topupWithoutNear,
  touchTopup,
  type TopupState,
} from "./draft";
import type { OfferPrefill } from "./types";

type Draft = Parameters<typeof holdsDraft>[0];
const to = { conversationId: 7 };
const OFF = { on: false, amount: null, currency: "USD", payer: "from" } as const;

const pick = (over: Partial<OfferPick> & Pick<OfferPick, "key">): OfferPick => ({
  collectionSlug: "atom01-heejin-101z",
  objektId: null,
  serial: null,
  listSlug: null,
  flags: null,
  ...over,
});

const build = (d: Partial<Parameters<typeof offerInput>[1]> = {}) => {
  const input = offerInput(to, { give: [], get: [], topup: OFF, note: "", ...d });
  expect(createOfferInputSchema.safeParse(input).success).toBe(true);
  return input;
};

describe("offerInput", () => {
  test("give sends only copies named by serial, without replaces", () => {
    const input = build({
      give: [
        pick({ key: "any:atom01-heejin-101z", count: 2 }),
        pick({ key: "o1", objektId: "o1", serial: 5, replaces: "any:atom01-heejin-101z" }),
      ],
    });
    expect(input.give).toEqual([{ collectionSlug: "atom01-heejin-101z", objektId: "o1" }]);
  });

  test("an any-copy get pick of 3 becomes 3 items", () => {
    const input = build({ get: [pick({ key: "any:atom01-heejin-101z", count: 3 })] });
    expect(input.get).toHaveLength(3);
  });

  test("a null objektId or listSlug becomes undefined", () => {
    const [item] = build({ get: [pick({ key: "any:atom01-heejin-101z" })] }).get;
    expect(item).toEqual({
      collectionSlug: "atom01-heejin-101z",
      objektId: undefined,
      listSlug: undefined,
    });
    const [named] = build({
      get: [pick({ key: "o2", objektId: "o2", listSlug: "abc" })],
    }).get;
    expect(named).toMatchObject({ objektId: "o2", listSlug: "abc" });
  });

  test("topup is sent only when on with an amount", () => {
    const on = { on: true, amount: 12, currency: "EUR", payer: "to" } as const;
    expect(build({ topup: on }).topup).toEqual({ amount: 12, currency: "EUR", payer: "to" });
    expect(build({ topup: { ...on, on: false } }).topup).toBeUndefined();
    expect(build({ topup: { ...on, amount: null } }).topup).toBeUndefined();
  });

  test("a blank note becomes undefined", () => {
    expect(build({ note: "" }).note).toBeUndefined();
    expect(build({ note: " \n\t " }).note).toBeUndefined();
  });

  test("a note is sent untrimmed, as the server trims it", () => {
    expect(build({ note: "  hi  " }).note).toBe("  hi  ");
  });

  test("the address is spread into the payload", () => {
    const target = { target: { kind: "user", userId: "u1" } } as const;
    const input = offerInput(target, { give: [], get: [], topup: OFF, note: "" });
    expect(input).toMatchObject(target);
    expect(createOfferInputSchema.safeParse(input).success).toBe(true);
  });
});

describe("holdsDraft", () => {
  const A = pick({ key: "a", objektId: "a" });
  const B = pick({ key: "b", objektId: "b" });
  const any = (count: number) => pick({ key: "any:atom01-heejin-101z", count });
  const topup = { amount: 10, currency: "USD", payer: "from" } as const;
  const prefill: OfferPrefill = { give: [A], get: [any(2)], topup, note: "hi" };
  const same: Draft = { give: [A], get: [any(2)], topup: { on: true, ...topup }, note: "hi" };
  const holds = (d: Partial<Draft> = {}, from: OfferPrefill | undefined = prefill) =>
    holdsDraft({ ...same, ...d }, from);

  test("an untouched prefill holds nothing", () => {
    expect(holds()).toBe(false);
  });

  test("an emptied builder holds nothing, even when matches had filled it", () => {
    expect(holds({ give: [], get: [], topup: OFF, note: "" })).toBe(false);
    expect(holds({ give: [], get: [], topup: OFF, note: " " })).toBe(false);
  });

  test("an open top-up with no amount holds nothing", () => {
    const open = { ...OFF, on: true };
    expect(holds({ give: [], get: [], topup: open, note: "" })).toBe(false);
  });

  test("a changed any-copy count is a change", () => {
    expect(holds({ get: [any(3)] })).toBe(true);
  });

  test("a currency or payer change counts only when there is an amount", () => {
    expect(holds({ topup: { ...same.topup, currency: "EUR" } })).toBe(true);
    expect(holds({ topup: { ...same.topup, payer: "to" } })).toBe(true);
    expect(holds({ topup: { ...same.topup, amount: null, currency: "EUR" } })).toBe(false);
    expect(holds({ topup: { ...same.topup, on: false, payer: "to" } })).toBe(false);
  });

  test("reordering picks is a change, as the keys are compared in order", () => {
    const two = { ...prefill, give: [A, B] };
    expect(holds({ give: [A, B] }, two)).toBe(false);
    expect(holds({ give: [B, A] }, two)).toBe(true);
  });

  test("a note that differs only in whitespace holds nothing", () => {
    expect(holds({ note: "  hi \n" })).toBe(false);
    expect(holds({ note: "hello" })).toBe(true);
  });

  test("removing a prefilled top-up is not a change, as it is current behaviour", () => {
    expect(holds({ topup: OFF })).toBe(false);
  });

  test("with no prefill, anything picked is a change", () => {
    expect(holds({ give: [A], get: [], topup: OFF, note: "" }, undefined)).toBe(true);
    expect(holds({ give: [], get: [], topup: OFF, note: "" }, undefined)).toBe(false);
  });
});

const SLUG = "atom01-heejin-101z";
const ask = (count?: number, slug = SLUG) =>
  pick({ key: `any:${slug}`, collectionSlug: slug, count });
const copy = (id: string | null, over: Partial<CandidateItem> = {}): CandidateItem => ({
  collectionSlug: SLUG,
  objektId: id,
  serial: 1,
  serialEstimated: false,
  transferable: true,
  reserved: false,
  inOpenOffer: [],
  listSlug: null,
  copies: null,
  bySerial: false,
  ...over,
});
const keysOf = (picks: OfferPick[]) => picks.map((p) => p.key);

describe("asksOf", () => {
  test("keeps the any-copy picks in order", () => {
    const a = ask(1, "a");
    const b = ask(1, "b");
    expect(asksOf([a, pick({ key: "o1", objektId: "o1" }), b])).toEqual([a, b]);
  });
});

describe("resolveAsks", () => {
  test("a pick named by serial passes through unchanged", () => {
    const named = pick({ key: "o1", objektId: "o1", serial: 5 });
    expect(resolveAsks([named], [])).toEqual([named]);
  });

  test("an ask with no page yet stays as is", () => {
    const a = ask(2);
    expect(resolveAsks([a], [undefined])).toEqual([a]);
  });

  test("suggested is read before items", () => {
    const shown = resolveAsks([ask()], [{ suggested: [copy("s")], items: [copy("i")] }]);
    expect(keysOf(shown)).toEqual(["s"]);
    expect(shown[0]).toMatchObject({ replaces: `any:${SLUG}`, objektId: "s" });
  });

  test("skips other collections, null objektId and blocked copies", () => {
    const shown = resolveAsks(
      [ask(3)],
      [
        {
          items: [
            copy("x", { collectionSlug: "other" }),
            copy(null),
            copy("nt", { transferable: false }),
            copy("rs", { reserved: true }),
            copy("ok"),
          ],
        },
      ],
    );
    expect(keysOf(shown)).toEqual(["ok", `any:${SLUG}`]);
  });

  test("a copy the side names by serial is never taken", () => {
    const named = pick({ key: "o1", objektId: "o1", serial: 1 });
    const shown = resolveAsks([named, ask()], [{ items: [copy("o1"), copy("o2")] }]);
    expect(keysOf(shown)).toEqual(["o1", "o2"]);
  });

  test("two asks of the same collection never share a copy", () => {
    const first = ask();
    const second = pick({ key: "any2", collectionSlug: SLUG });
    const page = { items: [copy("c1"), copy("c2")] };
    const shown = resolveAsks([first, second], [page, page]);
    expect(shown.map((p) => [p.key, p.replaces])).toEqual([
      ["c1", first.key],
      ["c2", "any2"],
    ]);
  });

  test("a copy in both suggested and items is taken once", () => {
    const shown = resolveAsks([ask(2)], [{ suggested: [copy("c1")], items: [copy("c1")] }]);
    expect(keysOf(shown)).toEqual(["c1", `any:${SLUG}`]);
  });

  test("an ask for 2 with 3 copies takes 2", () => {
    const shown = resolveAsks([ask(2)], [{ items: [copy("c1"), copy("c2"), copy("c3")] }]);
    expect(keysOf(shown)).toEqual(["c1", "c2"]);
  });

  test("a copy taken off the ask is passed over, so X removes the copy pressed", () => {
    const page = { items: [copy("c1"), copy("c2")] };
    const [first] = resolveAsks([ask(2)], [page]);
    const left = takeOut([ask(2)], first!);
    expect(keysOf(resolveAsks(left, [page]))).toEqual(["c2"]);
  });

  test("an ask for 3 with 2 found shows them, then the ask for the rest, in its place", () => {
    const a = ask(3);
    const before = pick({ key: "o0", objektId: "o0" });
    const after = pick({ key: "o9", objektId: "o9" });
    const shown = resolveAsks([before, a, after], [{ items: [copy("c1"), copy("c2")] }]);
    expect(keysOf(shown)).toEqual(["o0", "c1", "c2", a.key, "o9"]);
    expect(shown[1]!.replaces).toBe(a.key);
    expect(shown[2]!.replaces).toBe(a.key);
    expect(shown[3]).toEqual({ ...a, count: 1 });
  });
});

const liveOf = (...items: CandidateItem[]) =>
  new Map(items.map((item) => [item.objektId ?? `any:${item.collectionSlug}`, item]));
const FLAGS = { transferable: true, reserved: false, inOpenOffer: [], copies: null };

describe("pickProblem", () => {
  const ctx = (over: Partial<Parameters<typeof pickProblem>[2]> = {}) => ({
    get: [],
    live: liveOf(),
    loaded: true,
    source: "lists" as const,
    nameOf: (p: OfferPick) => `name of ${p.key}`,
    ...over,
  });

  test("an unresolved ask on give asks for a copy, by the injected name", () => {
    expect(pickProblem("give", ask(), ctx())).toBe(
      m.offer_flag_pick_copy({ name: `name of any:${SLUG}` }),
    );
  });

  test("a get pick missing from their lists is not listed", () => {
    expect(pickProblem("get", ask(), ctx())).toBe(m.offer_flag_not_listed());
  });

  test("a get pick is not checked against lists from their collection, when kept, or before load", () => {
    expect(pickProblem("get", ask(), ctx({ source: "collection" }))).toBeNull();
    expect(pickProblem("get", { ...ask(), kept: true }, ctx())).toBeNull();
    expect(pickProblem("get", ask(), ctx({ loaded: false }))).toBeNull();
  });

  test("a give pick named by serial is never not listed", () => {
    expect(pickProblem("give", pick({ key: "o1", objektId: "o1" }), ctx())).toBeNull();
  });

  test("an any-copy get pick is too many against the copies left", () => {
    const live = liveOf(copy(null, { copies: 2 }));
    expect(pickProblem("get", ask(3), ctx({ live }))).toBe(m.offer_flag_too_many({ count: 2 }));
    expect(pickProblem("get", ask(2), ctx({ live }))).toBeNull();
  });

  test("live copies win over the pick's own", () => {
    const own = ask(2);
    own.flags = { ...FLAGS, copies: 5 };
    const live = liveOf(copy(null, { copies: 1 }));
    expect(pickProblem("get", own, ctx({ live }))).toBe(m.offer_flag_too_many({ count: 1 }));
  });

  test("the pick's own copies are the fallback, and no count means no check", () => {
    const own = ask(3);
    own.flags = { ...FLAGS, copies: 2 };
    expect(pickProblem("get", { ...own, kept: true }, ctx())).toBe(
      m.offer_flag_too_many({ count: 2 }),
    );
    expect(pickProblem("get", { ...ask(9), kept: true }, ctx())).toBeNull();
  });

  test("copies the get side also names by serial count against the spare", () => {
    const live = liveOf(copy(null, { copies: 2 }));
    const named = pick({ key: "o1", objektId: "o1", serial: 1 });
    expect(pickProblem("get", ask(2), ctx({ live, get: [named] }))).toBe(
      m.offer_flag_too_many({ count: 1 }),
    );
  });

  test("own flags win over live ones, and live ones are the fallback", () => {
    const live = liveOf(copy("o1", { transferable: false }));
    const named = pick({ key: "o1", objektId: "o1" });
    expect(pickProblem("get", named, ctx({ live }))).toBe(m.offer_flag_not_transferable());
    expect(pickProblem("get", { ...named, flags: FLAGS }, ctx({ live }))).toBeNull();
    expect(pickFlags(named, live)).toEqual({
      transferable: false,
      reserved: false,
      inOpenOffer: [],
      copies: null,
    });
    expect(pickFlags({ ...named, flags: FLAGS }, live)).toBe(FLAGS);
    expect(pickFlags(named, liveOf())).toBeNull();
  });

  test("a reserved copy is refused", () => {
    const named = pick({ key: "o1", objektId: "o1", flags: { ...FLAGS, reserved: true } });
    expect(pickProblem("give", named, ctx())).toBe(m.offer_flag_reserved());
  });

  test("a clean pick gives null", () => {
    const live = liveOf(copy("o1"));
    expect(pickProblem("get", pick({ key: "o1", objektId: "o1" }), ctx({ live }))).toBeNull();
  });

  test("an estimated serial is the pick's own, else the live one", () => {
    const live = liveOf(copy("o1", { serialEstimated: true }));
    const named = pick({ key: "o1", objektId: "o1" });
    expect(pickEstimated(named, live)).toBe(true);
    expect(pickEstimated({ ...named, serialEstimated: false }, live)).toBe(false);
    expect(pickEstimated(named, liveOf())).toBe(false);
  });
});

describe("sendGate", () => {
  const one = pick({ key: "o1", objektId: "o1" });
  const TOPUP = { on: false, amount: null, currency: "USD" };
  const gate = (over: Partial<Parameters<typeof sendGate>[0]> = {}) =>
    sendGate({ give: [one], get: [], blocked: false, topup: TOPUP, note: "", ...over });
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => pick({ key: `o${i}`, objektId: `o${i}` }));

  test("a plain draft can be sent and shows the expiry line", () => {
    expect(gate()).toMatchObject({
      hint: m.offer_builder_expiry(),
      canSend: true,
      disabled: false,
      ariaDisabled: false,
      topupError: null,
    });
  });

  test("empty disables Send and shows the empty hint", () => {
    expect(gate({ give: [] })).toMatchObject({
      hint: m.offer_builder_empty_hint(),
      canSend: false,
      disabled: true,
    });
  });

  test("the hint goes empty, then over limit, then blocked, then note, then top-up error, then expiry", () => {
    const over = many(OFFER_SIDE_LIMIT + 1);
    const bad = { on: true, amount: null, currency: "USD" };
    expect(gate({ give: [], blocked: true, topup: bad }).hint).toBe(m.offer_builder_empty_hint());
    expect(gate({ give: over, blocked: true, topup: bad }).hint).toBe(
      m.offer_refused_too_many({ max: OFFER_SIDE_LIMIT }),
    );
    expect(gate({ blocked: true, topup: bad }).hint).toBe(m.offer_builder_blocked_hint());
    const long = "a".repeat(OFFER_NOTE_MAX_LENGTH + 1);
    expect(gate({ note: long, topup: bad }).hint).toBe(m.offer_builder_note_hint());
    expect(gate({ topup: bad }).hint).toBe(m.offer_topup_amount_required());
    expect(gate().hint).toBe(m.offer_builder_expiry());
  });

  test("a top-up amount of null, 0 or below is required, and above the maximum is max", () => {
    const err = (amount: number | null) =>
      gate({ topup: { on: true, amount, currency: "USD" } }).topupError;
    for (const amount of [null, 0, -5]) expect(err(amount)).toBe(m.offer_topup_amount_required());
    expect(err(TOPUP_MAX + 1)).toBe(
      m.offer_topup_amount_max({ max: TOPUP_MAX.toLocaleString(getLocale()) }),
    );
    expect(err(TOPUP_MAX)).toBeNull();
    expect(err(1)).toBeNull();
  });

  test("an off top-up never errors, whatever its amount", () => {
    expect(gate({ topup: { on: false, amount: -1, currency: "" } })).toMatchObject({
      topupError: null,
      canSend: true,
    });
  });

  test("a top-up error leaves Send clickable but aria-disabled", () => {
    expect(gate({ topup: { on: true, amount: null, currency: "USD" } })).toMatchObject({
      disabled: false,
      ariaDisabled: true,
      canSend: false,
    });
  });

  test("an open top-up with an amount and no currency disables Send, with no error", () => {
    expect(gate({ topup: { on: true, amount: 5, currency: "" } })).toMatchObject({
      topupError: null,
      hint: m.offer_builder_expiry(),
      disabled: true,
      ariaDisabled: false,
      canSend: false,
    });
  });

  test("an empty currency with an error is aria-disabled only", () => {
    expect(gate({ topup: { on: true, amount: null, currency: "" } })).toMatchObject({
      disabled: false,
      ariaDisabled: true,
      canSend: false,
    });
  });

  test("a note over the limit shows its hint and disables Send", () => {
    expect(gate({ note: "a".repeat(OFFER_NOTE_MAX_LENGTH + 1) })).toMatchObject({
      hint: m.offer_builder_note_hint(),
      disabled: true,
      canSend: false,
      noteTooLong: true,
    });
  });

  test("blocked disables Send", () => {
    expect(gate({ blocked: true })).toMatchObject({ disabled: true, canSend: false });
  });

  test("noteLength counts code points of the trimmed note", () => {
    expect(gate({ note: "  hi \u{1F600}  " }).noteLength).toBe(4);
    expect(gate({ note: "   " }).noteLength).toBe(0);
  });

  test("a note of 280 code points passes and 281 does not", () => {
    const emoji = (n: number) => "\u{1F600}".repeat(n);
    expect(gate({ note: emoji(OFFER_NOTE_MAX_LENGTH) })).toMatchObject({
      noteTooLong: false,
      canSend: true,
    });
    expect(gate({ note: emoji(OFFER_NOTE_MAX_LENGTH + 1) })).toMatchObject({
      noteTooLong: true,
      disabled: true,
      canSend: false,
    });
  });

  test("a side holds up to the limit, counting an ask's copies", () => {
    expect(gate({ give: many(OFFER_SIDE_LIMIT) }).canSend).toBe(true);
    expect(gate({ give: many(OFFER_SIDE_LIMIT + 1) })).toMatchObject({
      disabled: true,
      canSend: false,
    });
    expect(gate({ get: [ask(OFFER_SIDE_LIMIT)] }).canSend).toBe(true);
    expect(gate({ get: [ask(OFFER_SIDE_LIMIT + 1)] }).canSend).toBe(false);
  });

  test("the limit counts each side alone", () => {
    expect(gate({ give: many(OFFER_SIDE_LIMIT), get: [ask(OFFER_SIDE_LIMIT)] }).canSend).toBe(true);
  });
});

describe("top-up state", () => {
  const pick = (key: string) => ({ key, collectionSlug: key }) as unknown as OfferPick;
  const fresh = [pick("a")];
  const off: TopupState = {
    on: false,
    amount: null,
    chosenCurrency: null,
    payer: "from",
    touched: false,
    near: null,
  };
  const prefill = { amount: 5, currency: "EUR", payer: "to" } as const;

  test("initialTopup: nothing", () => {
    expect(initialTopup(undefined, undefined)).toEqual(off);
  });

  test("initialTopup: prefill only", () => {
    expect(initialTopup(prefill, undefined)).toEqual({
      on: true,
      amount: 5,
      chosenCurrency: "EUR",
      payer: "to",
      touched: false,
      near: null,
    });
  });

  test("initialTopup: near sale pays to, near buy from, both without an amount", () => {
    const sell = initialTopup(undefined, { verb: "sell", picks: fresh });
    expect(sell).toMatchObject({ on: true, amount: null, payer: "to", chosenCurrency: null });
    expect(sell.near).toEqual({ verb: "sell", picks: fresh });
    expect(initialTopup(undefined, { verb: "buy", picks: fresh })).toMatchObject({
      on: true,
      amount: null,
      payer: "from",
    });
  });

  test("initialTopup: prefill payer wins over the near one", () => {
    const t = initialTopup({ ...prefill, payer: "from" }, { verb: "sell", picks: fresh });
    expect(t.payer).toBe("from");
    expect(t.near).not.toBeNull();
  });

  test("initialTopup: a swap near keeps from (unreachable today)", () => {
    expect(initialTopup(undefined, { verb: "swap", picks: fresh }).payer).toBe("from");
  });

  test("topupValue: an unchosen currency follows the preferred one", () => {
    expect(topupValue(off, "KRW").currency).toBe("KRW");
    expect(topupValue(off, "USD").currency).toBe("USD");
  });

  test("topupValue: a chosen currency wins, and the value is exactly four fields", () => {
    const t = { ...off, on: true, amount: 3, chosenCurrency: "EUR", payer: "to" } as const;
    expect(topupValue(t, "KRW")).toEqual({ on: true, amount: 3, currency: "EUR", payer: "to" });
  });

  test("topupForNear: a closed top-up opens with the sale's payer", () => {
    const t = { ...off, chosenCurrency: "EUR" };
    const next = topupForNear(t, "sell", fresh);
    expect(next).toMatchObject({ on: true, payer: "to", chosenCurrency: "EUR" });
    expect(next.near).toEqual({ verb: "sell", picks: fresh });
  });

  test("topupForNear: leftover amount and touched are reset", () => {
    const next = topupForNear({ ...off, amount: 5, touched: true }, "sell", fresh);
    expect(next.amount).toBeNull();
    expect(next.touched).toBe(false);
  });

  test("topupForNear: a buy pays from", () => {
    expect(topupForNear({ ...off, payer: "to" }, "buy", fresh).payer).toBe("from");
  });

  test("topupForNear: swap, already on, or nothing fresh change nothing", () => {
    expect(topupForNear(off, "swap", fresh)).toBe(off);
    const on = { ...off, on: true };
    expect(topupForNear(on, "sell", fresh)).toBe(on);
    expect(topupForNear(off, "sell", [])).toBe(off);
  });

  test("topupWithoutNear: an amountless near top-up goes", () => {
    const near = { verb: "sell", picks: fresh } as const;
    const t = {
      ...off,
      on: true,
      payer: "to",
      chosenCurrency: "EUR",
      touched: true,
      near,
    } as const;
    const { topup, taken } = topupWithoutNear(t);
    expect(topup).toEqual({ ...t, on: false, near: null });
    expect(taken).toBe(near);
  });

  test("topupWithoutNear: an amount, even 0, stays", () => {
    const near = { verb: "sell", picks: fresh } as const;
    for (const amount of [5, 0]) {
      const t = { ...off, on: true, amount, near } as const;
      const out = topupWithoutNear(t);
      expect(out.topup).toBe(t);
      expect(out.taken).toBeNull();
    }
  });

  test("topupWithoutNear: no near changes nothing", () => {
    const t = { ...off, on: true };
    const out = topupWithoutNear(t);
    expect(out.topup).toBe(t);
    expect(out.taken).toBeNull();
  });

  test("topupRestored: nothing taken, or already on, changes nothing", () => {
    expect(topupRestored(off, null)).toBe(off);
    const on = { ...off, on: true };
    expect(topupRestored(on, { verb: "sell", picks: fresh })).toBe(on);
  });

  test("topupRestored: reopens with the payer and keeps amount and touched", () => {
    const near = { verb: "sell", picks: fresh } as const;
    const t = { ...off, amount: 5, touched: true };
    const next = topupRestored(t, near);
    expect(next).toEqual({ ...t, on: true, payer: "to", near });
  });

  test("topupRestored: a swap keeps the payer (unreachable today)", () => {
    const t = { ...off, payer: "to" } as const;
    expect(topupRestored(t, { verb: "swap", picks: fresh }).payer).toBe("to");
  });

  test("toggleTopup: on resets touched and keeps the rest", () => {
    const t = { ...off, amount: 4, payer: "to", touched: true } as const;
    expect(toggleTopup(t, true)).toEqual({ ...t, on: true, touched: false });
  });

  test("toggleTopup: off clears near and keeps the amount", () => {
    const near = { verb: "buy", picks: fresh } as const;
    const t = { ...off, on: true, amount: 4, touched: true, near } as const;
    expect(toggleTopup(t, false)).toEqual({ ...t, on: false, touched: false, near: null });
  });

  test("touchTopup: sets touched once", () => {
    const touched = touchTopup(off);
    expect(touched.touched).toBe(true);
    expect(touchTopup(touched)).toBe(touched);
  });

  test("near is only ever set while on", () => {
    const near = { verb: "sell", picks: fresh } as const;
    const starts: TopupState[] = [
      off,
      { ...off, amount: 5, touched: true },
      initialTopup(undefined, near),
      initialTopup(prefill, near),
      initialTopup(prefill, undefined),
    ];
    for (const s of starts) {
      const outs = [
        topupForNear(s, "sell", fresh),
        topupForNear(s, "buy", fresh),
        topupWithoutNear(s).topup,
        topupRestored(s, near),
        toggleTopup(s, true),
        toggleTopup(s, false),
        touchTopup(s),
        topupRestored(topupWithoutNear(s).topup, topupWithoutNear(s).taken),
      ];
      for (const o of outs) expect(o.near === null || o.on).toBe(true);
    }
  });
});
