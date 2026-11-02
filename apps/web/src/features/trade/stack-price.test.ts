import { describe, expect, test } from "bun:test";

import { m } from "@/paraglide/messages";

import { stackPriceText } from "./stack-price";

const rm = (amount: number) => `RM ${amount}`;

describe("stackPriceText", () => {
  test("one price when the copies agree", () => {
    expect(stackPriceText({ price: { min: 10, max: 10 } }, rm)).toEqual({
      text: "RM 10",
      muted: false,
    });
  });

  test("the lowest and highest when they differ, QYOP copies aside", () => {
    expect(stackPriceText({ price: { min: 10, max: 15 }, qyop: true }, rm).text).toBe(
      "RM 10–RM 15",
    );
  });

  test("QYOP when none is priced", () => {
    expect(stackPriceText({ qyop: true }, rm)).toEqual({
      text: m.list_manage_objekt_set_price_qyop(),
      muted: false,
    });
  });

  test("No price, muted, otherwise", () => {
    expect(stackPriceText({}, rm)).toEqual({ text: m.list_price_none(), muted: true });
  });
});
