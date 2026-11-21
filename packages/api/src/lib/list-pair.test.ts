import { describe, expect, test } from "bun:test";

import { flagsOf } from "../schemas/open-to";
import { pairRefusal } from "./list-pair";
import { DEFAULT_OPEN_TO } from "./trade-post-state";

const SWAPS = flagsOf("swaps");
const BOTH = flagsOf("both");
const BUYING = flagsOf("buying");

const have = { listType: "have" as const, takesSwaps: false, ...BOTH };
const sellOrSwap = { listType: "sale" as const, takesSwaps: true, ...BOTH };
const sellOnly = { listType: "sale" as const, takesSwaps: false, ...BOTH };
const want = (openTo = SWAPS) => ({ listType: "want" as const, takesSwaps: false, ...openTo });
const own = (openTo = SWAPS, takesSwaps = false) => ({ openTo, takesSwaps });

describe("pairRefusal", () => {
  test("a want list links to a have list, or to a sale list that takes swaps", () => {
    expect(pairRefusal("want", own(), have)).toBeNull();
    expect(pairRefusal("want", own(BOTH), sellOrSwap)).toBeNull();
    expect(pairRefusal("have", own(), want())).toBeNull();
    expect(pairRefusal("sale", own(BOTH, true), want(BOTH))).toBeNull();
  });

  test("a want list can't link to a Sell only sale list, nor a Sell only list to a want list", () => {
    expect(pairRefusal("want", own(), sellOnly)).toBe("list_sale_links_sell_only");
    expect(pairRefusal("sale", own(BOTH, false), want())).toBe("list_sale_links_sell_only");
  });

  test("the want side of a pair is never Buying only", () => {
    expect(pairRefusal("want", own(BUYING), have)).toBe("list_pair_buying_only");
    expect(pairRefusal("want", own(BUYING), sellOrSwap)).toBe("list_pair_buying_only");
    expect(pairRefusal("have", own(), want(BUYING))).toBe("list_pair_buying_only");
    expect(pairRefusal("sale", own(BOTH, true), want(BUYING))).toBe("list_pair_buying_only");
  });

  test("have and sale lists link only to want lists, want lists only to have or sale", () => {
    expect(pairRefusal("have", own(), have)).toBe("list_have_links_want");
    expect(pairRefusal("sale", own(BOTH, true), sellOrSwap)).toBe("list_have_links_want");
    expect(pairRefusal("want", own(), want())).toBe("list_want_links_have");
  });

  test("a partner in no row reads the defaults, and so does the new list's own", () => {
    const own = { openTo: DEFAULT_OPEN_TO, takesSwaps: false };
    // a want list never posted is Swaps or buying, so a have list may link to it
    expect(pairRefusal("have", own, { listType: "want", ...DEFAULT_OPEN_TO })).toBeNull();
    // a sale list never posted is Sell only, so a want list may not
    expect(pairRefusal("want", own, { listType: "sale", ...DEFAULT_OPEN_TO })).toBe(
      "list_sale_links_sell_only",
    );
    expect(pairRefusal("want", own, { listType: "have", ...DEFAULT_OPEN_TO })).toBeNull();
  });
});
