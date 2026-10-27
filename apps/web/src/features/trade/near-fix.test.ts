import { describe, expect, test } from "bun:test";

import type { ComposerStart } from "@repo/api/schemas/trade-post";

import { nearFixOf, nearFixStart } from "./near-fix";

const start = (over: Partial<ComposerStart>): ComposerStart => ({
  kind: null,
  have: null,
  want: null,
  sale: null,
  alsoPay: false,
  alsoSwap: false,
  replaces: null,
  ...over,
});

describe("nearFixOf", () => {
  test("each verb and side has its fix", () => {
    expect(nearFixOf("sell", "want")).toBe("sale-list");
    expect(nearFixOf("swap", "want")).toBe("open-sale");
    expect(nearFixOf("swap", "have")).toBe("open-want-swaps");
    expect(nearFixOf("buy", "sale")).toBe("open-want-buying");
  });
});

describe("nearFixStart", () => {
  test("a Sell only post opens to swaps", () => {
    const sell = start({ kind: "sell", sale: "spares", replaces: "spares" });
    expect(nearFixStart(sell, "open-sale")).toEqual({ ...sell, alsoSwap: true });
  });

  test("a Buy post becomes a Swap that also pays", () => {
    const buy = start({ kind: "buy", want: "hunt", replaces: "hunt" });
    expect(nearFixStart(buy, "open-want-swaps")).toEqual({ ...buy, kind: "swap", alsoPay: true });
  });

  test("a Swap post's want list also pays, and a Sell post's keeps its kind", () => {
    const swap = start({ kind: "swap", have: "doubles", want: "hunt", replaces: "doubles" });
    expect(nearFixStart(swap, "open-want-buying")).toEqual({ ...swap, alsoPay: true });
    const sell = start({ kind: "sell", sale: "s", want: "w", alsoSwap: true });
    expect(nearFixStart(sell, "open-want-buying").kind).toBe("sell");
  });

  test("a want list on no post starts a Swap that also pays", () => {
    expect(nearFixStart(start({ want: "hunt" }), "open-want-buying")).toMatchObject({
      kind: "swap",
      want: "hunt",
      alsoPay: true,
    });
  });
});
