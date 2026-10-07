import { describe, expect, test } from "bun:test";

import {
  assemblePost,
  comparePosts,
  type FeedEntry,
  isPostIdle,
  nextBumpAt,
  pairPosts,
  PREVIEW_LIMIT,
  previewSide,
  type TradeList,
  tradeableEntries,
  untradeableKey,
} from "./trade-feed";

const NOW = new Date("2026-10-07T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

const list = (over: Partial<TradeList> & Pick<TradeList, "id" | "listTypeNew">): TradeList => ({
  userId: "u1",
  linkedListId: null,
  bumpedAt: daysAgo(1),
  updatedAt: daysAgo(1),
  ...over,
});

const entry = (id: number, slug: string, objektId: string | null = null): FeedEntry => ({
  id,
  slug,
  objektId,
  price: null,
  isQyop: false,
});

const NO_FILTER = { slugs: null, slug: null } as const;

describe("pairPosts", () => {
  test("linked pair is one post", () => {
    const spares = list({ id: 1, listTypeNew: "have", linkedListId: 2 });
    const hunt = list({ id: 2, listTypeNew: "want", linkedListId: 1 });
    const posts = pairPosts([hunt, spares]);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ tag: "wtt", anchor: spares, have: spares, want: hunt });
  });

  test("half a pair holds only the list on Trade", () => {
    const spares = list({ id: 1, listTypeNew: "have", linkedListId: 2 });
    const posts = pairPosts([spares]);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ tag: "wtt", have: spares, want: null });
  });

  test("a want list alone is WTB, a sale list WTS", () => {
    const tags = pairPosts([
      list({ id: 2, listTypeNew: "want", linkedListId: 1 }),
      list({ id: 3, listTypeNew: "sale" }),
    ]).map((post) => post.tag);
    expect(tags).toEqual(["wtb", "wts"]);
  });

  test("a pair's bump and change times are the latest of its lists", () => {
    const [post] = pairPosts([
      list({ id: 1, listTypeNew: "have", linkedListId: 2, bumpedAt: daysAgo(3) }),
      list({ id: 2, listTypeNew: "want", bumpedAt: daysAgo(2), updatedAt: hoursAgo(1) }),
    ]);
    expect(post?.bumpedAt).toBe(daysAgo(2));
    expect(post?.updatedAt).toBe(hoursAgo(1));
  });
});

describe("order and idle", () => {
  test("edit does not jump the queue", () => {
    const [edited, bumped] = pairPosts([
      list({ id: 1, listTypeNew: "want", bumpedAt: daysAgo(3), updatedAt: hoursAgo(0) }),
      list({ id: 2, listTypeNew: "want", bumpedAt: daysAgo(1) }),
    ]);
    const order = [edited!, bumped!].toSorted(comparePosts).map((post) => post.anchor.id);
    expect(order).toEqual([2, 1]);
    expect(isPostIdle(edited!, NOW)).toBe(false);
  });

  test("a post never bumped sorts by its last change", () => {
    const posts = pairPosts([
      list({ id: 1, listTypeNew: "want", bumpedAt: daysAgo(3) }),
      list({ id: 2, listTypeNew: "want", bumpedAt: null, updatedAt: daysAgo(1) }),
      list({ id: 3, listTypeNew: "want", bumpedAt: null, updatedAt: daysAgo(5) }),
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

describe("ownership", () => {
  const untradeable = new Set([
    untradeableKey("u1", { objektId: "t2", slug: "s2" }),
    untradeableKey("u1", { objektId: null, slug: "c-gone" }),
  ]);

  test("sold and untransferable entries are hidden", () => {
    const shown = tradeableEntries(
      [entry(1, "s1", "t1"), entry(2, "s2", "t2"), entry(4, "c-held"), entry(5, "c-gone")],
      "u1",
      untradeable,
    );
    expect(shown.map((e) => e.id)).toEqual([1, 4]);
  });

  test("a failure belongs to its owner, and a token is not its collection", () => {
    expect(tradeableEntries([entry(2, "s2", "t2")], "u2", untradeable)).toHaveLength(1);
    expect(tradeableEntries([entry(6, "c-gone", "t9")], "u1", untradeable)).toHaveLength(1);
  });

  test("nothing left", () => {
    const [post] = pairPosts([list({ id: 1, listTypeNew: "have" })]);
    const sold = tradeableEntries([entry(1, "s2", "t2")], "u1", untradeable);
    expect(assemblePost(post!, () => sold, null, NO_FILTER)).toBeNull();
  });
});

describe("previewSide", () => {
  test("ringed first, then newest, with the rest counted", () => {
    const entries = Array.from({ length: 12 }, (_, i) => entry(i + 1, `s${i + 1}`));
    const { items, more } = previewSide(entries, new Map([["s2", [1]]]));
    expect(items).toHaveLength(PREVIEW_LIMIT);
    expect(items.map((item) => item.entryId)).toEqual([2, 12, 11, 10, 9, 8, 7, 6]);
    expect(items[0]?.ringed).toBe(true);
    expect("ringed" in items[1]!).toBe(false);
    expect(more).toBe(4);
  });

  test("a signed-out viewer gets no rings", () => {
    const { items } = previewSide([entry(1, "s1")], null);
    expect("ringed" in items[0]!).toBe(false);
  });
});

describe("assemblePost", () => {
  const [pair] = pairPosts([
    list({ id: 1, listTypeNew: "have", linkedListId: 2 }),
    list({ id: 2, listTypeNew: "want" }),
  ]);
  const entries: Record<number, FeedEntry[]> = {
    1: [entry(10, "offer-a"), entry(11, "offer-b")],
    2: [entry(20, "want-a"), entry(21, "want-b"), entry(22, "want-c")],
  };
  const of = (id: number) => entries[id] ?? [];
  const viewer = {
    have: new Map([
      ["want-a", [7]],
      ["want-c", [7, 8]],
    ]),
    want: new Map([["offer-b", [9]]]),
  };

  test("counts, rings and the viewer's lists they came from", () => {
    const post = assemblePost(pair!, of, viewer, NO_FILTER);
    expect(post?.match).toEqual({ youHave: 2, youWant: 1, haveListIds: [7, 8], wantListIds: [9] });
    const want = post?.sides.find((side) => side.role === "want");
    expect(want?.items.filter((item) => item.ringed).map((item) => item.slug)).toEqual([
      "want-c",
      "want-a",
    ]);
  });

  test("nothing listed counts nothing", () => {
    const post = assemblePost(pair!, of, { have: new Map(), want: new Map() }, NO_FILTER);
    expect(post?.match).toEqual({ youHave: 0, youWant: 0, haveListIds: [], wantListIds: [] });
  });

  test("signed out has no match", () => {
    expect(assemblePost(pair!, of, null, NO_FILTER)?.match).toBeUndefined();
  });

  test("filters keep posts with a shown collection", () => {
    expect(assemblePost(pair!, of, null, { ...NO_FILTER, slug: "offer-a" })).not.toBeNull();
    expect(assemblePost(pair!, of, null, { ...NO_FILTER, slug: "other" })).toBeNull();
    expect(
      assemblePost(pair!, of, null, { ...NO_FILTER, slugs: new Set(["want-b"]) }),
    ).not.toBeNull();
  });
});
