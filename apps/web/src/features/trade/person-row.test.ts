import { describe, expect, test } from "bun:test";

import {
  leadPost,
  listCount,
  matchBand,
  matchedListIds,
  orderPosts,
  ruleCountsOf,
  swapThroughRules,
} from "./person-row";

const post = (id: number, bumpedAt: string, match?: { youHave: number; youWant: number }) => ({
  id,
  bumpedAt,
  updatedAt: bumpedAt,
  match,
});

describe("orderPosts", () => {
  test("a post that matched comes first, whatever its bump", () => {
    const s24 = post(1, "2026-10-06T19:54:57Z", { youHave: 0, youWant: 0 });
    const wishlist = post(2, "2026-09-01T00:00:00Z", { youHave: 3, youWant: 0 });
    const atom = post(3, "2026-10-01T00:00:00Z");
    expect(orderPosts([s24, atom, wishlist]).map((p) => p.id)).toEqual([2, 1, 3]);
    expect(leadPost([s24, atom, wishlist])?.id).toBe(2);
  });

  test("most matched collections first, then the rest by newest bump", () => {
    const few = post(1, "2026-10-10T00:00:00Z", { youHave: 1, youWant: 0 });
    const many = post(2, "2026-10-01T00:00:00Z", { youHave: 2, youWant: 3 });
    const old = post(3, "2026-09-01T00:00:00Z");
    const fresh = post(4, "2026-10-12T00:00:00Z");
    expect(orderPosts([old, few, fresh, many]).map((p) => p.id)).toEqual([2, 1, 4, 3]);
  });

  test("a post never bumped sorts by its last change", () => {
    const never = { id: 1, bumpedAt: null, updatedAt: "2026-10-12T00:00:00Z" };
    expect(orderPosts([post(2, "2026-10-01T00:00:00Z"), never]).map((p) => p.id)).toEqual([1, 2]);
  });

  test("no posts has no lead", () => {
    expect(leadPost([])).toBeUndefined();
  });
});

describe("matchBand", () => {
  /** counts where every match is a swap */
  const swaps = (theyHave: number, youHave: number) => ({
    theyHave,
    youHave,
    tradeTheyHave: theyHave,
    tradeYouHave: youHave,
  });

  test("swap when both ways match, by the smaller count, with both counts", () => {
    expect(matchBand(swaps(4, 2))).toEqual({ kind: "swap", swap: 2, theyHave: 4, youHave: 2 });
  });

  test("one each way is a swap of one", () => {
    expect(matchBand(swaps(1, 1))).toEqual({ kind: "swap", swap: 1, theyHave: 1, youHave: 1 });
  });

  test("one way, either direction", () => {
    expect(matchBand(swaps(0, 3))).toEqual({ kind: "oneWay", theyHave: 0, youHave: 3 });
    expect(matchBand(swaps(3, 0))).toEqual({ kind: "oneWay", theyHave: 3, youHave: 0 });
  });

  test("the swap counts set the score, a sale on top doesn't raise it", () => {
    const counts = { theyHave: 5, youHave: 2, tradeTheyHave: 1, tradeYouHave: 2 };
    expect(matchBand(counts)).toEqual({ kind: "swap", swap: 1, theyHave: 5, youHave: 2 });
  });

  test("both ways through sale lists is no swap", () => {
    const sale = { theyHave: 3, youHave: 1, tradeTheyHave: 0, tradeYouHave: 0 };
    expect(matchBand(sale)).toEqual({ kind: "noSwap", theyHave: 3, youHave: 1 });
  });

  test("no match, no band", () => {
    expect(matchBand(swaps(0, 0))).toBeNull();
    expect(matchBand(undefined)).toBeNull();
  });
});

describe("listCount", () => {
  const counted = post(1, "2026-10-01T00:00:00Z", { youHave: 2, youWant: 14 });

  test("a pair counts each side on its own", () => {
    expect(listCount(counted, { role: "have" })).toBe(14);
    expect(listCount(counted, { role: "want" })).toBe(2);
  });

  test("a sale list counts what the viewer wants", () => {
    expect(listCount(counted, { role: "sale" })).toBe(14);
  });

  test("no match, no count", () => {
    expect(listCount(post(2, "2026-10-01T00:00:00Z"), { role: "want" })).toBe(0);
  });
});

describe("matchedListIds", () => {
  const matched = {
    ...post(1, "2026-10-01T00:00:00Z", { youHave: 2, youWant: 14 }),
    match: { youHave: 2, youWant: 14, haveListIds: [7, 8], wantListIds: [9] },
  };

  test("a want list names the viewer's have and sale lists, a have or sale list their want lists", () => {
    expect(matchedListIds(matched, { role: "want" })).toEqual([7, 8]);
    expect(matchedListIds(matched, { role: "have" })).toEqual([9]);
    expect(matchedListIds(matched, { role: "sale" })).toEqual([9]);
  });

  test("no match, no lists", () => {
    expect(matchedListIds(post(2, "2026-10-01T00:00:00Z"), { role: "want" })).toEqual([]);
  });
});

describe("ruleCountsOf", () => {
  const found = (slug: string, listId: number, ruleId: number) => ({ slug, listId, ruleId });
  const matches = [found("a", 9, 1), found("b", 9, 2), found("c", 9, 1), found("d", 7, 3)];

  test("counts each rule of one list, in the order found", () => {
    expect(ruleCountsOf(matches, 9).map(({ match, count }) => [match.ruleId, count])).toEqual([
      [1, 2],
      [2, 1],
    ]);
  });

  test("a list matched by hand alone has no rule lines", () => {
    expect(ruleCountsOf(matches, 8)).toEqual([]);
  });
});

describe("swapThroughRules", () => {
  const counts = (tradeTheyHave: number, tradeYouHave: number) => ({
    theyHave: tradeTheyHave,
    youHave: tradeYouHave,
    tradeTheyHave,
    tradeYouHave,
  });
  const via = (...slugs: string[]) => [
    { ruleMatches: slugs.map((slug) => ({ slug, swap: true })) },
  ];

  test("every collection of the swap through rules", () => {
    expect(swapThroughRules(counts(2, 2), via("a", "b"))).toBe(2);
  });

  test("collections wanted by hand cover the swap first", () => {
    // 3 they have (1 through a rule), swap of 1: the 2 by hand already make it
    expect(swapThroughRules(counts(3, 1), via("a"))).toBe(0);
  });

  test("only the shortfall counts", () => {
    // 3 they have (2 through rules), swap of 2: 1 by hand, 1 needs a rule
    expect(swapThroughRules(counts(3, 2), via("a", "b"))).toBe(1);
  });

  test("a collection found in two posts counts once", () => {
    expect(swapThroughRules(counts(1, 1), [...via("a"), ...via("a")])).toBe(1);
  });

  test("a rule match that is not a swap counts for nothing", () => {
    const sale = [{ ruleMatches: [{ slug: "a", swap: false }] }];
    expect(swapThroughRules(counts(1, 1), sale)).toBe(0);
  });

  test("no swap, nothing through rules", () => {
    expect(swapThroughRules(counts(2, 0), via("a", "b"))).toBe(0);
    expect(swapThroughRules(undefined, via("a"))).toBe(0);
  });
});
