import { describe, expect, test } from "bun:test";

import { comparePosts, isPostIdle, nextBumpAt, pairPosts, type TradeList } from "./trade-posts";

const NOW = new Date("2026-10-07T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

const list = (over: Partial<TradeList> & Pick<TradeList, "id" | "listType">): TradeList => ({
  userId: "u1",
  linkedListId: null,
  matchSale: true,
  matchHave: true,
  takesSwaps: false,
  bumpedAt: daysAgo(1),
  updatedAt: daysAgo(1),
  ...over,
});

describe("pairPosts", () => {
  test("linked pair is one post", () => {
    const spares = list({ id: 1, listType: "have", linkedListId: 2 });
    const hunt = list({ id: 2, listType: "want", linkedListId: 1 });
    const posts = pairPosts([hunt, spares]);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ tag: "wtt", anchor: spares, have: spares, want: hunt });
  });

  test("half a pair holds only the list on Trade", () => {
    const spares = list({ id: 1, listType: "have", linkedListId: 2 });
    const posts = pairPosts([spares]);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ tag: "wtt", have: spares, want: null });
  });

  test("a want list alone open to swaps or buying is WTT and WTB, a sale list WTS", () => {
    const posts = pairPosts([
      list({ id: 2, listType: "want", linkedListId: 1, matchSale: true }),
      list({ id: 3, listType: "sale" }),
    ]);
    expect(posts.map((post) => post.tags)).toEqual([["wtt", "wtb"], ["wts"]]);
    // the single tag keeps its old rule for chat cards
    expect(posts.map((post) => post.tag)).toEqual(["wtb", "wts"]);
  });

  test("a want list alone that matches trades only is WTT", () => {
    const [post] = pairPosts([list({ id: 2, listType: "want", matchSale: false })]);
    expect(post).toMatchObject({ tags: ["wtt"], tag: "wtt", have: null });
  });

  test("a want list alone that is Buying only is WTB only", () => {
    const [post] = pairPosts([list({ id: 2, listType: "want", matchHave: false })]);
    expect(post).toMatchObject({ tags: ["wtb"], tag: "wtb" });
  });

  test("a have list linked to a Buying only want list is one WTT and WTB post", () => {
    const posts = pairPosts([
      list({ id: 1, listType: "have", linkedListId: 2 }),
      list({ id: 2, listType: "want", linkedListId: 1, matchHave: false }),
    ]);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ tags: ["wtt", "wtb"], tag: "wtt" });
  });

  test("a pair whose want list is open to swaps only is WTT only", () => {
    const [post] = pairPosts([
      list({ id: 1, listType: "have", linkedListId: 2 }),
      list({ id: 2, listType: "want", linkedListId: 1, matchSale: false }),
    ]);
    expect(post).toMatchObject({ tags: ["wtt"] });
  });

  test("a pair's bump and change times are the latest of its lists", () => {
    const [post] = pairPosts([
      list({ id: 1, listType: "have", linkedListId: 2, bumpedAt: daysAgo(3) }),
      list({ id: 2, listType: "want", bumpedAt: daysAgo(2), updatedAt: hoursAgo(1) }),
    ]);
    expect(post?.bumpedAt).toBe(daysAgo(2));
    expect(post?.updatedAt).toBe(hoursAgo(1));
  });
});

describe("order and idle", () => {
  test("edit does not jump the queue", () => {
    const [edited, bumped] = pairPosts([
      list({ id: 1, listType: "want", bumpedAt: daysAgo(3), updatedAt: hoursAgo(0) }),
      list({ id: 2, listType: "want", bumpedAt: daysAgo(1) }),
    ]);
    const order = [edited!, bumped!].toSorted(comparePosts).map((post) => post.anchor.id);
    expect(order).toEqual([2, 1]);
    expect(isPostIdle(edited!, NOW)).toBe(false);
  });

  test("a post never bumped sorts by its last change", () => {
    const posts = pairPosts([
      list({ id: 1, listType: "want", bumpedAt: daysAgo(3) }),
      list({ id: 2, listType: "want", bumpedAt: null, updatedAt: daysAgo(1) }),
      list({ id: 3, listType: "want", bumpedAt: null, updatedAt: daysAgo(5) }),
    ]);
    expect(posts.toSorted(comparePosts).map((post) => post.anchor.id)).toEqual([2, 1, 3]);
  });

  test("idle post drops out", () => {
    expect(isPostIdle({ bumpedAt: daysAgo(31), updatedAt: daysAgo(31) }, NOW)).toBe(true);
    expect(isPostIdle({ bumpedAt: daysAgo(31), updatedAt: daysAgo(2) }, NOW)).toBe(false);
    expect(isPostIdle({ bumpedAt: daysAgo(2), updatedAt: daysAgo(40) }, NOW)).toBe(false);
  });
});

describe("nextBumpAt", () => {
  test("too soon to bump", () => {
    expect(nextBumpAt(hoursAgo(3), NOW)).toBe(
      new Date(NOW.getTime() + 21 * 3600_000).toISOString(),
    );
  });

  test("allowed after 24 hours, or when never bumped", () => {
    expect(nextBumpAt(hoursAgo(26), NOW)).toBeNull();
    expect(nextBumpAt(null, NOW)).toBeNull();
  });
});
