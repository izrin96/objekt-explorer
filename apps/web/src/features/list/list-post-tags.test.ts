import { describe, expect, test } from "bun:test";

import { listPostTags } from "./list-post-tags";

const list = (id: number, listType: "have" | "want" | "sale" | "general", rest = {}) => ({
  id,
  listType,
  isProfileBind: listType !== "want",
  discoverable: true,
  matchSale: false,
  matchHave: true,
  takesSwaps: false,
  ...rest,
});

describe("listPostTags", () => {
  test("off Trade, no tags", () => {
    expect(listPostTags(list(1, "want", { discoverable: false }))).toEqual([]);
    expect(listPostTags(list(1, "have", { isProfileBind: false }))).toEqual([]);
    expect(listPostTags(list(1, "general"))).toEqual([]);
  });

  test("a want list alone, by its Open to", () => {
    expect(listPostTags(list(1, "want"))).toEqual(["wtt"]);
    expect(listPostTags(list(1, "want", { matchSale: true }))).toEqual(["wtt", "wtb"]);
    expect(listPostTags(list(1, "want", { matchSale: true, matchHave: false }))).toEqual(["wtb"]);
  });

  test("either half of a Swap pair reads the pair's tags", () => {
    const want = list(2, "want", { matchSale: true });
    expect(listPostTags({ ...list(1, "have"), linkedList: want })).toEqual(["wtt", "wtb"]);
    expect(listPostTags({ ...want, linkedList: list(1, "have") })).toEqual(["wtt", "wtb"]);
  });

  test("a partner off Trade leaves the list a post of its own", () => {
    const want = list(2, "want", { matchSale: true, discoverable: false });
    expect(listPostTags({ ...list(1, "have"), linkedList: want })).toEqual(["wtt"]);
  });

  test("a sale list: Sell, Sell or swap, and the want side that also pays", () => {
    expect(listPostTags(list(1, "sale"))).toEqual(["wts"]);
    const swaps = list(1, "sale", { takesSwaps: true });
    expect(listPostTags(swaps)).toEqual(["wts", "wtt"]);
    const pays = list(2, "want", { matchSale: true });
    expect(listPostTags({ ...swaps, linkedList: pays })).toEqual(["wts", "wtt", "wtb"]);
  });
});
