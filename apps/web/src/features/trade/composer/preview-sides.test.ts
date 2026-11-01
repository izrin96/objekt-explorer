import { describe, expect, test } from "bun:test";

import { postInput } from "../composer-choice";
import { previewSides } from "./preview-sides";

const base = { have: null, want: null, sale: null, alsoPay: false, alsoSwap: false };

describe("previewSides", () => {
  test("a Swap post shows both sides, each taking a ratio", () => {
    const sides = previewSides(postInput({ ...base, kind: "swap", have: "spares" }, null));
    expect(sides).toEqual([
      { role: "have", slug: "spares", ratio: "have" },
      { role: "want", slug: null, ratio: "want" },
    ]);
  });

  test("a Sell post's sale list takes no ratio, and its want side shows only with swaps", () => {
    const sell = { ...base, kind: "sell" as const, sale: "binary-sale", want: "binary-hunt" };
    expect(previewSides(postInput(sell, null))).toEqual([
      { role: "sale", slug: "binary-sale", ratio: null },
    ]);
    expect(previewSides(postInput({ ...sell, alsoSwap: true }, null))).toEqual([
      { role: "sale", slug: "binary-sale", ratio: null },
      { role: "want", slug: "binary-hunt", ratio: "want" },
    ]);
  });

  test("a Buy post's want list takes no ratio", () => {
    expect(previewSides(postInput({ ...base, kind: "buy", want: "store-hunt" }, null))).toEqual([
      { role: "want", slug: "store-hunt", ratio: null },
    ]);
  });
});
