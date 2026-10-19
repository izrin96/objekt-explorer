import { describe, expect, test } from "bun:test";

import { headerSentence, leadPost, listCount, orderPosts } from "./person-row";

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

describe("headerSentence", () => {
  /** counts where every match is a swap */
  const swaps = (theyHave: number, youHave: number) => ({
    theyHave,
    youHave,
    tradeTheyHave: theyHave,
    tradeYouHave: youHave,
  });

  test("swap when both ways match, by the smaller count", () => {
    expect(headerSentence(swaps(4, 2))).toEqual({ kind: "swap", count: 2 });
  });

  test("you have, when only the viewer's side matches", () => {
    expect(headerSentence(swaps(0, 3))).toEqual({ kind: "youHave", count: 3 });
    expect(headerSentence(swaps(0, 1))).toEqual({ kind: "youHave", count: 1 });
  });

  test("they have, when only their side matches", () => {
    expect(headerSentence(swaps(3, 0))).toEqual({ kind: "theyHave", count: 3 });
    expect(headerSentence(swaps(1, 0))).toEqual({ kind: "theyHave", count: 1 });
  });

  test("one each way is a swap of one", () => {
    expect(headerSentence(swaps(1, 1))).toEqual({ kind: "swap", count: 1 });
  });

  test("the swap counts set the score, a sale on top doesn't raise it", () => {
    const counts = { theyHave: 5, youHave: 2, tradeTheyHave: 1, tradeYouHave: 2 };
    expect(headerSentence(counts)).toEqual({ kind: "swap", count: 1 });
  });

  test("a sale-only person both ways is not a swap", () => {
    const sale = { theyHave: 3, youHave: 1, tradeTheyHave: 0, tradeYouHave: 0 };
    expect(headerSentence(sale)).toEqual({ kind: "youHave", count: 1 });
  });

  test("no match", () => {
    expect(headerSentence(swaps(0, 0))).toEqual({ kind: "none" });
    expect(headerSentence(undefined)).toEqual({ kind: "none" });
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
