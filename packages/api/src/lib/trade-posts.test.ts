import { describe, expect, test } from "bun:test";

import { type PostRow, sideStateOf } from "./trade-post-state";
import {
  comparePosts,
  isPostIdle,
  nextBumpAt,
  pairPosts,
  postFromRow,
  type TradeList,
} from "./trade-posts";

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

const row = (over: Partial<PostRow> & Pick<PostRow, "id" | "leadListId">): PostRow => ({
  wantListId: null,
  leadOnTrade: true,
  wantOnTrade: true,
  leadBumpedAt: daysAgo(2),
  wantBumpedAt: daysAgo(3),
  matchHave: true,
  matchSale: false,
  takesSwaps: true,
  ...over,
});
const posted = (over: Partial<TradeList> & Pick<TradeList, "id" | "listType">) => ({
  ...list(over),
  postId: null as number | null,
});

describe("sideStateOf", () => {
  test("an on side reads the row's state, an off side the list's own Open to", () => {
    const want = posted({ id: 2, listType: "want", matchHave: false, matchSale: true });
    const on = row({ id: 10, leadListId: 1, wantListId: 2 });
    expect(sideStateOf(on, want)).toEqual({
      onTrade: true,
      bumpedAt: daysAgo(3),
      matchHave: true,
      matchSale: false,
      takesSwaps: false,
    });
    expect(sideStateOf({ ...on, wantOnTrade: false }, want)).toMatchObject({
      onTrade: false,
      matchHave: false,
      matchSale: true,
    });
  });

  test("a sale lead takes the row's takes_swaps; a have list keeps its own flags", () => {
    const sale = posted({ id: 1, listType: "sale", takesSwaps: false });
    const have = posted({ id: 3, listType: "have", matchHave: true, matchSale: true });
    expect(sideStateOf(row({ id: 10, leadListId: 1 }), sale).takesSwaps).toBe(true);
    expect(sideStateOf(row({ id: 11, leadListId: 3, matchSale: false }), have)).toMatchObject({
      matchSale: true,
      bumpedAt: daysAgo(2),
    });
  });
});

describe("postFromRow", () => {
  test("a pair is one post keyed to its row", () => {
    const have = posted({ id: 1, listType: "have" });
    const want = posted({ id: 2, listType: "want" });
    const posts = postFromRow(row({ id: 10, leadListId: 1, wantListId: 2 }), have, want);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      anchor: { id: 1, postId: 10, linkedListId: 2 },
      want: { id: 2, postId: 10, linkedListId: 1, matchHave: true, matchSale: false },
      bumpedAt: daysAgo(2),
    });
  });

  test("a lone side, lead or want", () => {
    const have = posted({ id: 1, listType: "have" });
    const want = posted({ id: 2, listType: "want" });
    const r = row({ id: 10, leadListId: 1, wantListId: 2 });
    expect(postFromRow(r, have, null).map((post) => [post.anchor.id, post.want])).toEqual([
      [1, null],
    ]);
    expect(postFromRow(r, null, want).map((post) => post.anchor.id)).toEqual([2]);
    const buy = posted({ id: 4, listType: "want", matchHave: true });
    const [post] = postFromRow(
      row({ id: 12, leadListId: 4, matchHave: false, matchSale: true }),
      buy,
      null,
    );
    expect(post).toMatchObject({ tags: ["wtb"], anchor: { postId: 12, linkedListId: null } });
  });

  test("a Sell only lead with its want side on Trade is two posts", () => {
    const sale = posted({ id: 1, listType: "sale" });
    const want = posted({ id: 2, listType: "want" });
    const posts = postFromRow(
      row({ id: 10, leadListId: 1, wantListId: 2, takesSwaps: false }),
      sale,
      want,
    );
    expect(posts.map((post) => [post.anchor.id, post.tags])).toEqual([
      [1, ["wts"]],
      [2, ["wtt"]],
    ]);
  });

  test("an off side takes the list's own Open to", () => {
    const want = posted({ id: 2, listType: "want", matchHave: false, matchSale: true });
    const [post] = postFromRow(
      row({ id: 10, leadListId: 1, wantListId: 2, wantOnTrade: false }),
      null,
      want,
    );
    expect(post).toMatchObject({ tags: ["wtb"], want: { matchHave: false, matchSale: true } });
  });

  test("one list in two rows is two posts, each with its own row's values", () => {
    const have = posted({ id: 1, listType: "have" });
    const swaps = posted({ id: 2, listType: "want" });
    const both = posted({ id: 3, listType: "want" });
    const first = row({ id: 10, leadListId: 1, wantListId: 2, leadBumpedAt: daysAgo(5) });
    const second = row({
      id: 11,
      leadListId: 1,
      wantListId: 3,
      leadBumpedAt: daysAgo(1),
      matchSale: true,
    });
    const [a] = postFromRow(first, have, swaps);
    const [b] = postFromRow(second, have, both);
    expect([a?.anchor.postId, a?.tags, a?.anchor.bumpedAt]).toEqual([10, ["wtt"], daysAgo(5)]);
    expect([b?.anchor.postId, b?.tags, b?.anchor.bumpedAt]).toEqual([
      11,
      ["wtt", "wtb"],
      daysAgo(1),
    ]);
    // the list passed in is copied, never changed
    expect(have.postId).toBeNull();
  });
});
