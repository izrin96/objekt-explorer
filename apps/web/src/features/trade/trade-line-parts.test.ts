import { describe, expect, test } from "bun:test";

import type { PlanList, TradeLine } from "@repo/api/schemas/trade-post";

import { lineDetail, lineHint } from "./trade-line-parts";

const partner = (listType: PlanList["listType"]) => ({ listType }) as PlanList;
type InPost = Extract<TradeLine, { state: "in_post" }>;
const inPost = (patch: Partial<InPost>): InPost => ({
  state: "in_post",
  kind: "sell",
  tags: [],
  alsoPay: false,
  alsoSwap: false,
  partner: null,
  ...patch,
});

describe("lineDetail", () => {
  test("a sale list names its Open to and Market", () => {
    expect(lineDetail(inPost({}), "sale")).toEqual(["sell_only", "market"]);
    expect(
      lineDetail(inPost({ alsoSwap: true, alsoPay: true, partner: partner("want") }), "sale"),
    ).toEqual(["sell_or_swap", "partner", "also_pay", "market"]);
  });

  test("a want list in a Sell post reads as before, with neither", () => {
    expect(
      lineDetail(inPost({ alsoSwap: true, alsoPay: true, partner: partner("sale") }), "want"),
    ).toEqual(["partner", "also_pay"]);
  });

  test("a Buy post's want list says Buying only", () => {
    expect(lineDetail(inPost({ kind: "buy" }), "want")).toEqual(["buying_only"]);
  });

  test("a Swap post's have list names its pair", () => {
    expect(lineDetail(inPost({ kind: "swap", partner: partner("want") }), "have")).toEqual([
      "partner",
    ]);
  });
});

describe("lineHint", () => {
  test("a pair off Trade names the post it comes back as", () => {
    const off = (other: PlanList["listType"]) =>
      ({ state: "paired_off", partner: partner(other) }) as const;
    expect(lineHint(off("want"), "have")).toBe("paired_off_swap");
    expect(lineHint(off("have"), "want")).toBe("paired_off_swap");
    expect(lineHint(off("want"), "sale")).toBe("paired_off_sell");
    expect(lineHint(off("sale"), "want")).toBe("paired_off_sell");
  });

  test("a list in no post", () => {
    expect(lineHint({ state: "off" }, "want")).toBe("not_on");
    expect(lineHint({ state: "off" }, "sale")).toBe("not_on_sale");
    expect(lineHint({ state: "needs_profile" }, "sale")).toBe("needs_profile");
  });
});
