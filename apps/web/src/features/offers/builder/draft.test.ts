import { describe, expect, test } from "bun:test";

import { createOfferInputSchema } from "@repo/api/schemas/offer";

import type { OfferPick } from "@/features/offers/pick";

import { holdsDraft, offerInput } from "./draft";
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
