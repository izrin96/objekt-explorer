import { describe, expect, test } from "bun:test";

import { PREVIEW_LIMIT, SOLO_PREVIEW_LIMIT } from "../schemas/trade";
import {
  assemblePost,
  browseMode,
  buildPeopleOrder,
  comparePosts,
  cursorScope,
  type FeedEntry,
  type FeedPhase,
  feedPlan,
  fullSide,
  listMatchesOf,
  fillPage,
  readBatches,
  readBudget,
  isSectioned,
  isPostIdle,
  matchesViewer,
  mergeSeen,
  narrowViewer,
  nextBumpAt,
  nextSlice,
  type OrderEntry,
  orderReader,
  ordersFingerprint,
  pairPosts,
  phaseAfter,
  phaseScope,
  previewSide,
  resumeAt,
  type TradeList,
  tradeableEntries,
  untradeableKey,
  type Viewer,
  ruleMatchesOf,
  ruleTiles,
} from "./trade-feed";

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

const entry = (id: number, slug: string, objektId: string | null = null): FeedEntry => ({
  id,
  slug,
  objektId,
});

const NO_FILTER = { slugs: null, slug: null, onlyMatches: false } as const;

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
    // the single tag keeps its old rule for open tabs and chat cards
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
    const [post] = pairPosts([list({ id: 1, listType: "have" })]);
    const sold = tradeableEntries([entry(1, "s2", "t2")], "u1", untradeable);
    expect(assemblePost(post!, () => sold, null, NO_FILTER)).toBeNull();
  });
});

describe("previewSide", () => {
  test("ringed first, then newest, with the rest counted", () => {
    const total = PREVIEW_LIMIT + 3;
    const entries = Array.from({ length: total }, (_, i) => entry(i + 1, `s${i + 1}`));
    const { items, more } = previewSide(entries, new Map([["s2", [1]]]));
    expect(items).toHaveLength(PREVIEW_LIMIT);
    expect(items.map((item) => item.entryId)).toEqual([
      2,
      ...Array.from({ length: PREVIEW_LIMIT - 1 }, (_, i) => total - i),
    ]);
    expect(items[0]?.ringed).toBe(true);
    expect("ringed" in items[1]!).toBe(false);
    expect(more).toBe(3);
  });

  test("a signed-out viewer gets no rings", () => {
    const { items } = previewSide([entry(1, "s1")], null);
    expect("ringed" in items[0]!).toBe(false);
  });

  test("copies of a collection stack under their newest, counted by collection", () => {
    const entries = [
      entry(1, "a"),
      entry(5, "a"),
      entry(3, "a"),
      ...Array.from({ length: PREVIEW_LIMIT }, (_, i) => entry(10 + i, `s${i}`)),
    ];
    const { items, more, copyCount } = previewSide(entries, new Map([["a", [1]]]));
    expect(items[0]).toMatchObject({ entryId: 5, slug: "a", qty: 3, ringed: true });
    expect(items).toHaveLength(PREVIEW_LIMIT);
    expect(items.filter((item) => item.slug === "a")).toHaveLength(1);
    expect(more).toBe(1);
    expect(copyCount).toBe(PREVIEW_LIMIT + 3);
  });
});

describe("assemblePost", () => {
  const [pair] = pairPosts([
    list({ id: 1, listType: "have", linkedListId: 2 }),
    list({ id: 2, listType: "want" }),
  ]);
  const entries: Record<number, FeedEntry[]> = {
    1: [entry(10, "offer-a"), entry(11, "offer-b")],
    2: [entry(20, "want-a"), entry(21, "want-b"), entry(22, "want-c")],
  };
  const of = (id: number) => entries[id] ?? [];
  const have = new Map([
    ["want-a", [7]],
    ["want-c", [7, 8]],
  ]);
  const want = new Map([["offer-b", [9]]]);
  const nothing = new Map<string, number[]>();
  const viewer = {
    have,
    want,
    tradeHave: have,
    saleHave: nothing,
    tradeWant: want,
    saleWant: want,
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
    const empty = {
      have: nothing,
      want: nothing,
      tradeHave: nothing,
      saleHave: nothing,
      tradeWant: nothing,
      saleWant: nothing,
    };
    const post = assemblePost(pair!, of, empty, NO_FILTER);
    expect(post?.match).toEqual({ youHave: 0, youWant: 0, haveListIds: [], wantListIds: [] });
  });

  test("signed out has no match", () => {
    expect(assemblePost(pair!, of, null, NO_FILTER)?.match).toBeUndefined();
  });

  test("a one-sided post sends more of its side than a pair sends of each", () => {
    const many = (base: number) =>
      Array.from({ length: SOLO_PREVIEW_LIMIT + 5 }, (_, i) => entry(base + i, `s${base + i}`));
    const [solo] = pairPosts([list({ id: 3, listType: "sale" })]);
    const soloSide = assemblePost(solo!, () => many(100), null, NO_FILTER)?.sides[0];
    expect(soloSide?.items).toHaveLength(SOLO_PREVIEW_LIMIT);
    expect(soloSide?.more).toBe(5);
    const sides = assemblePost(pair!, (id) => many(id * 100), null, NO_FILTER)?.sides;
    expect(sides?.map((side) => side.items.length)).toEqual([PREVIEW_LIMIT, PREVIEW_LIMIT]);
  });

  const sideOf = (post: ReturnType<typeof assemblePost>, role: string) =>
    post?.sides.find((side) => side.role === role);

  test("an unfiltered side has no others", () => {
    const post = assemblePost(pair!, of, null, NO_FILTER);
    expect(post?.sides.map((side) => side.others)).toEqual([0, 0]);
  });

  test("a facet narrows each side and counts the rest as others", () => {
    const post = assemblePost(pair!, of, null, {
      ...NO_FILTER,
      slugs: new Set(["offer-a", "want-b", "want-c"]),
    });
    expect(sideOf(post, "have")?.items.map((item) => item.slug)).toEqual(["offer-a"]);
    expect(sideOf(post, "have")?.others).toBe(1);
    expect(sideOf(post, "want")?.items.map((item) => item.slug)).toEqual(["want-c", "want-b"]);
    expect(sideOf(post, "want")?.others).toBe(1);
  });

  test("a slug narrows each side to that collection", () => {
    const post = assemblePost(pair!, of, null, { ...NO_FILTER, slug: "offer-a" });
    expect(sideOf(post, "have")?.items.map((item) => item.slug)).toEqual(["offer-a"]);
    expect(sideOf(post, "have")?.others).toBe(1);
    expect(sideOf(post, "want")).toMatchObject({ items: [], more: 0, others: 3 });
    expect(assemblePost(pair!, of, null, { ...NO_FILTER, slug: "other" })).toBeNull();
  });

  test("only matches shows ringed objekts alone", () => {
    const post = assemblePost(pair!, of, viewer, { ...NO_FILTER, onlyMatches: true });
    const have = sideOf(post, "have");
    expect(have?.items.map((item) => item.slug)).toEqual(["offer-b"]);
    expect(have?.items.every((item) => item.ringed)).toBe(true);
    expect(have?.others).toBe(1);
    const wanted = sideOf(post, "want");
    expect(wanted?.items.map((item) => item.slug)).toEqual(["want-c", "want-a"]);
    expect(wanted?.items.every((item) => item.ringed)).toBe(true);
    expect(wanted?.others).toBe(1);
  });

  test("only matches combines with a facet", () => {
    const post = assemblePost(pair!, of, viewer, {
      slugs: new Set(["want-a", "want-b"]),
      slug: null,
      onlyMatches: true,
    });
    expect(sideOf(post, "want")?.items.map((item) => item.slug)).toEqual(["want-a"]);
    expect(sideOf(post, "want")?.others).toBe(2);
    expect(sideOf(post, "have")).toMatchObject({ items: [], others: 2 });
  });

  test("a side counts its collections whole, copies as one and a rule's left out", () => {
    const copies: Record<number, FeedEntry[]> = {
      1: [entry(10, "offer-a"), entry(11, "offer-b"), entry(12, "offer-b")],
      2: [entry(20, "want-a"), { ...entry(21, "want-z"), ruleId: 5 }],
    };
    const post = assemblePost(pair!, (id) => copies[id] ?? [], viewer, {
      ...NO_FILTER,
      onlyMatches: true,
    });
    expect(sideOf(post, "have")).toMatchObject({ copyCount: 2, others: 1, collectionCount: 2 });
    expect(sideOf(post, "want")?.collectionCount).toBe(1);
  });

  test("a one-way match keeps the empty side", () => {
    const oneWay = { ...viewer, want: nothing, tradeWant: nothing, saleWant: nothing };
    const post = assemblePost(pair!, of, oneWay, { ...NO_FILTER, onlyMatches: true });
    expect(sideOf(post, "have")).toMatchObject({ items: [], more: 0, others: 2 });
    expect(sideOf(post, "want")?.items).toHaveLength(2);
  });

  test("a post with nothing related on any side is dropped", () => {
    const filter = { ...NO_FILTER, slugs: new Set(["elsewhere"]) };
    expect(assemblePost(pair!, of, null, filter)).toBeNull();
    const none = {
      have: nothing,
      want: nothing,
      tradeHave: nothing,
      saleHave: nothing,
      tradeWant: nothing,
      saleWant: nothing,
    };
    expect(assemblePost(pair!, of, none, { ...NO_FILTER, onlyMatches: true })).toBeNull();
  });

  test("narrowing leaves the match counts on the whole post", () => {
    const post = assemblePost(pair!, of, viewer, { ...NO_FILTER, slugs: new Set(["want-a"]) });
    expect(post?.match).toEqual({ youHave: 2, youWant: 1, haveListIds: [7, 8], wantListIds: [9] });
  });

  // list 8 is the viewer's sale list, list 9 a want list that matches trades only
  const tradeOnly = {
    have,
    want,
    tradeHave: new Map([
      ["want-a", [7]],
      ["want-c", [7]],
    ]),
    saleHave: new Map([["want-c", [8]]]),
    tradeWant: want,
    saleWant: nothing,
  };

  test("a sale post does not match a want list that trades only", () => {
    const [sale] = pairPosts([list({ id: 3, listType: "sale" })]);
    const post = assemblePost(sale!, () => [entry(30, "offer-b")], tradeOnly, NO_FILTER);
    expect(post?.match).toEqual({ youHave: 0, youWant: 0, haveListIds: [], wantListIds: [] });
    expect(post?.sides[0]?.items.some((item) => item.ringed)).toBe(false);
  });

  test("a want list that trades only matches the viewer's have lists, not their sale lists", () => {
    const [tradeOnlyPair] = pairPosts([
      list({ id: 1, listType: "have", linkedListId: 2 }),
      list({ id: 2, listType: "want", matchSale: false }),
    ]);
    const post = assemblePost(tradeOnlyPair!, of, tradeOnly, NO_FILTER);
    expect(post?.match).toEqual({ youHave: 2, youWant: 1, haveListIds: [7], wantListIds: [9] });
  });
});

describe("Buying only rings", () => {
  const entries = [entry(1, "a"), entry(2, "b")];
  const none = new Map<string, number[]>();
  // list 7 is the viewer's have list, 8 their sale list, 9 their swaps-only want list,
  // 10 their Buying only want list
  const viewer: Viewer = {
    have: new Map([
      ["a", [7]],
      ["b", [8]],
    ]),
    tradeHave: new Map([["a", [7]]]),
    saleHave: new Map([["b", [8]]]),
    want: new Map([
      ["a", [9]],
      ["b", [10]],
    ]),
    tradeWant: new Map([["a", [9]]]),
    saleWant: new Map([["b", [10]]]),
  };
  const ringed = (post: ReturnType<typeof pairPosts>[number]) =>
    assemblePost(post, () => entries, viewer, NO_FILTER)?.sides[0]?.items.filter(
      (item) => item.ringed,
    );

  test("a have post rings only against my want lists open to swaps", () => {
    const [post] = pairPosts([list({ id: 1, listType: "have" })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["a"]);
  });

  test("a Buying only want post rings only against my sale lists", () => {
    const [post] = pairPosts([list({ id: 2, listType: "want", matchHave: false })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["b"]);
  });

  test("a swaps-only want post rings only against my have lists", () => {
    const [post] = pairPosts([list({ id: 2, listType: "want", matchSale: false })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["a"]);
  });

  test("a want post open to both rings against my have and sale lists", () => {
    const [post] = pairPosts([list({ id: 2, listType: "want" })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["b", "a"]);
  });

  test("a sale post rings only against my want lists open to buying", () => {
    const [post] = pairPosts([list({ id: 3, listType: "sale" })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["b"]);
  });

  test("a sale post open to swaps rings against all my want lists", () => {
    const [post] = pairPosts([list({ id: 3, listType: "sale", takesSwaps: true })]);
    expect(
      ringed(post!)
        ?.map((item) => item.slug)
        .toSorted(),
    ).toEqual(["a", "b"]);
  });

  test("a viewer with only a Buying only want list matches no have post", () => {
    const [post] = pairPosts([list({ id: 1, listType: "have" })]);
    const buyer: Viewer = { ...viewer, tradeWant: none };
    expect(assemblePost(post!, () => entries, buyer, NO_FILTER)?.match).toEqual({
      youHave: 0,
      youWant: 0,
      haveListIds: [],
      wantListIds: [],
    });
  });
});

describe("matchesViewer", () => {
  test("both zero is no match", () => {
    expect(matchesViewer({ youHave: 0, youWant: 0 })).toBe(false);
  });

  test("one side is enough", () => {
    expect(matchesViewer({ youHave: 2, youWant: 0 })).toBe(true);
    expect(matchesViewer({ youHave: 0, youWant: 1 })).toBe(true);
  });

  test("both sides", () => {
    expect(matchesViewer({ youHave: 3, youWant: 4 })).toBe(true);
  });

  test("signed out has no match", () => {
    expect(matchesViewer(undefined)).toBe(false);
  });
});

describe("browseMode", () => {
  test("absent is off, matches is any, and match wins", () => {
    expect(browseMode({})).toBe("off");
    expect(browseMode({ matches: false })).toBe("off");
    expect(browseMode({ matches: true })).toBe("any");
    expect(browseMode({ match: "mutual", matches: true })).toBe("mutual");
    expect(browseMode({ match: "off", matches: true })).toBe("off");
  });
});

describe("narrowViewer", () => {
  const viewer: Viewer = {
    have: new Map([
      ["a", [1, 2]],
      ["b", [3]],
    ]),
    tradeHave: new Map([["a", [1]]]),
    saleHave: new Map([
      ["a", [2]],
      ["b", [3]],
    ]),
    want: new Map([
      ["c", [10]],
      ["d", [11]],
    ]),
    tradeWant: new Map([["d", [11]]]),
    saleWant: new Map([["c", [10]]]),
  };

  test("a pair keeps both directions", () => {
    const narrowed = narrowViewer(viewer, { haveListIds: [1], wantListIds: [10] });
    expect([...narrowed.have]).toEqual([["a", [1]]]);
    expect([...narrowed.tradeHave]).toEqual([["a", [1]]]);
    expect([...narrowed.want]).toEqual([["c", [10]]]);
    expect([...narrowed.saleWant]).toEqual([["c", [10]]]);
    expect(narrowed.tradeWant.size).toBe(0);
    expect(narrowed.saleHave.size).toBe(0);
  });

  test("a lone have list empties want", () => {
    const narrowed = narrowViewer(viewer, { haveListIds: [1], wantListIds: [] });
    expect(narrowed.want.size).toBe(0);
    expect(narrowed.saleWant.size).toBe(0);
    expect(narrowed.have.size).toBe(1);
  });

  test("a sale list keeps only its own have entries", () => {
    const narrowed = narrowViewer(viewer, { haveListIds: [2], wantListIds: [] });
    expect([...narrowed.have]).toEqual([["a", [2]]]);
    expect(narrowed.tradeHave.size).toBe(0);
    expect([...narrowed.saleHave]).toEqual([["a", [2]]]);
  });
});

describe("cursorScope", () => {
  test("holds back everyone without grouped owners, the resumed person when grouped", () => {
    expect(cursorScope(null)).toBe("all");
    expect(cursorScope({ resume: true })).toBe("first");
  });

  test("holds back no one when the cursor's person left the ranking", () => {
    expect(cursorScope({ resume: false })).toBe("none");
  });
});

describe("feedPlan", () => {
  const rank = { mutual: 1, sum: 2, at: 0, userId: "u" };
  const cursor = { bumpedAt: "2026-10-07T09:12:30.123Z", id: 12 };

  test("Browse reads the plain bump order and Mutual only its own phase", () => {
    expect(feedPlan("off", "all")).toEqual({ phases: ["bump"], mutualOwned: false });
    expect(feedPlan("mutual", "wtt", { rank })).toEqual({ phases: ["mutual"], mutualOwned: false });
  });

  test("Any reads Mutual, One way people, then the tail", () => {
    for (const type of ["all", "wtt"] as const) {
      expect(feedPlan("any", type)).toEqual({
        phases: ["mutual", "oneWay", "tail"],
        mutualOwned: true,
      });
    }
  });

  test("WTB and WTS skip the Mutual phase", () => {
    for (const type of ["wtb", "wts"] as const) {
      expect(feedPlan("any", type)).toEqual({ phases: ["oneWay", "tail"], mutualOwned: false });
    }
  });

  test("a cursor resumes in the phase it names", () => {
    expect(feedPlan("any", "all", { phase: "oneWay" }).phases).toEqual(["oneWay", "tail"]);
    expect(feedPlan("any", "all", { phase: "tail" }).phases).toEqual(["tail"]);
    expect(feedPlan("any", "all", { phase: "mutual", rank }).phases).toEqual([
      "mutual",
      "oneWay",
      "tail",
    ]);
  });

  test("a phase the type skips resumes at the next one", () => {
    expect(feedPlan("any", "wts", { phase: "mutual" }).phases).toEqual(["oneWay", "tail"]);
  });

  test("an older Any cursor, with no phase and no rank, continues the plain bump order", () => {
    expect(feedPlan("any", "all", cursor)).toEqual({ phases: ["bump"], mutualOwned: false });
  });

  test("an older Mutual cursor, with a rank and no phase, continues Mutual", () => {
    expect(feedPlan("mutual", "wtt", { rank }).phases).toEqual(["mutual"]);
    expect(feedPlan("any", "all", { rank }).phases).toEqual(["mutual", "oneWay", "tail"]);
  });
});

describe("isSectioned", () => {
  test("only Any's phases carry sections", () => {
    expect(isSectioned(["mutual", "oneWay", "tail"])).toBe(true);
    expect(isSectioned(["tail"])).toBe(true);
    expect(isSectioned(["bump"])).toBe(false);
    expect(isSectioned(["mutual"])).toBe(false);
  });
});

describe("phaseAfter", () => {
  test("a phase that runs dry hands the page to the next, and the last ends it", () => {
    const phases = feedPlan("any", "all").phases;
    expect(phaseAfter(phases, "mutual")).toBe("oneWay");
    expect(phaseAfter(phases, "oneWay")).toBe("tail");
    expect(phaseAfter(phases, "tail")).toBeNull();
  });

  test("with no Mutual phase, One way is first and Mutual hands off to nothing", () => {
    const phases = feedPlan("any", "wtb").phases;
    expect(phaseAfter(phases, "oneWay")).toBe("tail");
    expect(phaseAfter(["mutual"], "mutual")).toBeNull();
  });
});

describe("phaseScope", () => {
  const plan = feedPlan("any", "all");
  const seen = { mutual: ["m1", "m2"], oneWay: ["o1", "o2", "m1", "m2"] };

  test("Mutual leaves nothing out", () => {
    expect(phaseScope("mutual", plan, seen)).toEqual({
      excludeWttOf: undefined,
      excludeOwners: undefined,
    });
  });

  test("One way leaves out a Mutual person's WTT posts, the tail also every One way person", () => {
    expect(phaseScope("oneWay", plan, seen)).toEqual({
      excludeWttOf: ["m1", "m2"],
      excludeOwners: undefined,
    });
    expect(phaseScope("tail", plan, seen)).toEqual({
      excludeWttOf: ["m1", "m2"],
      excludeOwners: seen.oneWay,
    });
  });

  test("WTB and WTS have no Mutual posts to leave out", () => {
    expect(phaseScope("oneWay", feedPlan("any", "wtb"), seen).excludeWttOf).toBeUndefined();
  });

  test("the plain bump order leaves nothing out", () => {
    expect(phaseScope("bump", feedPlan("off", "all"), seen)).toEqual({
      excludeWttOf: undefined,
      excludeOwners: undefined,
    });
  });
});

describe("a person's place changes between loads", () => {
  /** the posts of each person: p1 and p2 each have one WTT post */
  const wttPosts = new Map([
    ["p1", 101],
    ["p2", 102],
    ["p3", 103],
  ]);
  const listed = (
    phase: FeedPhase,
    plan: ReturnType<typeof feedPlan>,
    now: string[],
    snapshot?: string[],
  ) => {
    const seen = mergeSeen(snapshot ? { mutual: snapshot, oneWay: [] } : undefined, {
      mutual: now,
      oneWay: [],
    });
    const { excludeWttOf = [] } = phaseScope(phase, plan, seen);
    return [...wttPosts].filter(([person]) => !excludeWttOf.includes(person)).map(([, id]) => id);
  };

  test("a person who leaves Mutual keeps their shown WTT post out of One way", () => {
    const plan = feedPlan("any", "all", { phase: "oneWay" });
    // load 1 showed p1 and p2 as Mutual; by load 2 only p2 still is
    const withSnapshot = listed("oneWay", plan, ["p2"], ["p1", "p2"]);
    expect(withSnapshot).toEqual([103]);
    // with no snapshot (expired), the current ranking alone stands
    expect(listed("oneWay", plan, ["p2"])).toEqual([101, 103]);
  });

  test("a person who joins Mutual has no WTT post under One way or the tail", () => {
    const plan = feedPlan("any", "all", { phase: "tail" });
    expect(listed("tail", plan, ["p1", "p3"], ["p1"])).toEqual([102]);
  });

  test("the merged set is the union, once each", () => {
    expect(
      mergeSeen({ mutual: ["a", "b"], oneWay: ["c"] }, { mutual: ["b", "d"], oneWay: ["c", "e"] }),
    ).toEqual({ mutual: ["a", "b", "d"], oneWay: ["c", "e"] });
  });
});

describe("fillPage by person", () => {
  const people = (from: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({ userId: `u${from + i}` }));

  test("counts people, lists none twice and hands a dry phase's rest on", async () => {
    const page = await fillPage(
      ["mutual", "oneWay", "tail"],
      12,
      async (phase) =>
        phase === "mutual"
          ? { posts: people(1, 5), dry: true, last: "u5" }
          : { posts: [...people(3, 2), ...people(10, 20)].slice(0, 9), dry: false, last: "x" },
      (person) => person.userId,
    );
    expect(page.posts).toHaveLength(12);
    expect(new Set(page.posts.map((person) => person.userId)).size).toBe(12);
    expect(page.posts.find((person) => person.userId === "u3")?.phase).toBe("mutual");
    expect(page.next?.phase).toBe("oneWay");
  });
});

describe("fillPage", () => {
  const byId = (post: { id: number }) => post.id;
  const ids = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ id: from + i }));

  /** each phase's posts in order; a read takes up to `need` from where the phase stopped */
  function world(phases: Partial<Record<FeedPhase, { id: number }[]>>) {
    const taken = { mutual: 0, oneWay: 0, tail: 0, bump: 0 };
    return async (phase: FeedPhase, need: number) => {
      const all = phases[phase] ?? [];
      const posts = all.slice(taken[phase], taken[phase] + need);
      taken[phase] += posts.length;
      return { posts, dry: taken[phase] >= all.length, last: posts.at(-1)?.id };
    };
  }

  test("a phase that runs dry mid-page hands the rest to the next", async () => {
    const page = await fillPage(
      ["mutual", "oneWay", "tail"],
      24,
      world({ mutual: ids(1, 10), oneWay: ids(100, 40) }),
      byId,
    );
    expect(page.posts).toHaveLength(24);
    expect(page.posts.slice(0, 10).every((post) => post.phase === "mutual")).toBe(true);
    expect(page.posts.slice(10).every((post) => post.phase === "oneWay")).toBe(true);
    expect(page.next).toEqual({ phase: "oneWay", last: 113 });
  });

  test("a page that fills exactly as a phase runs dry still continues into the next", async () => {
    const page = await fillPage(
      ["mutual", "oneWay", "tail"],
      24,
      world({ mutual: ids(1, 24), oneWay: ids(100, 5) }),
      byId,
    );
    expect(page.posts).toHaveLength(24);
    expect(page.next).toEqual({ phase: "mutual", last: 24 });
  });

  test("a phase that ran dry empty is skipped", async () => {
    const page = await fillPage(
      ["mutual", "oneWay", "tail"],
      24,
      world({ tail: ids(500, 30) }),
      byId,
    );
    expect(page.posts.map((post) => post.phase)).toEqual(Array(24).fill("tail"));
    expect(page.next).toEqual({ phase: "tail", last: 523 });
  });

  test("the last phase running dry ends the feed", async () => {
    const page = await fillPage(
      ["mutual", "oneWay", "tail"],
      24,
      world({ mutual: ids(1, 3), oneWay: ids(100, 2), tail: ids(500, 4) }),
      byId,
    );
    expect(page.posts).toHaveLength(9);
    expect(page.next).toBeUndefined();
  });

  test("a full page ending as the last phase runs dry has no cursor", async () => {
    const page = await fillPage(["tail"], 24, world({ tail: ids(1, 24) }), byId);
    expect(page.posts).toHaveLength(24);
    expect(page.next).toBeUndefined();
  });

  test("a short phase that is not dry stops the page where it is", async () => {
    const short = async () => ({ posts: ids(1, 5), dry: false, last: 5 });
    const page = await fillPage(["oneWay", "tail"], 24, short, byId);
    expect(page.posts).toHaveLength(5);
    expect(page.next).toEqual({ phase: "oneWay", last: 5 });
  });

  test("lists no post twice across phases", async () => {
    const page = await fillPage(
      ["mutual", "oneWay", "tail"],
      24,
      world({ mutual: ids(1, 3), oneWay: [...ids(2, 3), ...ids(10, 2)], tail: ids(3, 4) }),
      byId,
    );
    const listed = page.posts.map((post) => post.id);
    expect(new Set(listed).size).toBe(listed.length);
    expect(page.posts.find((post) => post.id === 2)?.phase).toBe("mutual");
  });

  test("asks each phase only for what the page still needs", async () => {
    const needs: [FeedPhase, number][] = [];
    const read = world({ mutual: ids(1, 10), oneWay: ids(100, 40) });
    await fillPage(
      ["mutual", "oneWay", "tail"],
      24,
      async (phase, need) => {
        needs.push([phase, need]);
        return read(phase, need);
      },
      byId,
    );
    expect(needs).toEqual([
      ["mutual", 24],
      ["oneWay", 14],
    ]);
  });
});

describe("readBudget", () => {
  test("a phase's first read always runs, later ones spend the budget", () => {
    const reads = readBudget(2);
    expect(reads.allow(false)).toBe(true);
    expect(reads.allow(false)).toBe(true);
    expect(reads.allow(false)).toBe(false);
    expect(reads.allow(true)).toBe(true);
  });

  test("a capped phase that kept nobody still hands on its cursor", async () => {
    const page = await fillPage(
      ["oneWay", "tail"],
      12,
      async () => ({ posts: [] as { id: string }[], dry: false, last: "emptied" }),
      (item) => item.id,
    );
    expect(page).toEqual({ posts: [], next: { phase: "oneWay", last: "emptied" } });
  });
});

describe("readBatches", () => {
  /** rows 1..n in order; `kept` decides who survives stage 2 */
  const source = (n: number, kept: (row: number) => boolean) => {
    let at = 0;
    return {
      fetch: async (limit: number) => {
        const rows = Array.from({ length: Math.min(limit, n - at) }, (_, i) => at + i + 1);
        at += rows.length;
        return { rows, exhausted: at >= n };
      },
      load: async (rows: number[]) => rows.filter(kept),
    };
  };

  test("a first batch that all emptied still moves past it", async () => {
    const read = await readBatches({ need: 3, budget: readBudget(0), ...source(10, () => false) });
    expect(read).toEqual({ taken: [], examined: 3, dry: false });
  });

  test("the budget stops a run of sold-out rows without calling the phase dry", async () => {
    const read = await readBatches({
      need: 2,
      budget: readBudget(2),
      ...source(20, (row) => row > 15),
    });
    // three reads of two rows each, all emptied
    expect(read).toEqual({ taken: [], examined: 6, dry: false });
  });

  test("a phase entered by handoff gets its first read on a spent budget", async () => {
    const budget = readBudget(0);
    expect(budget.allow(false)).toBe(false);
    const read = await readBatches({ need: 2, budget, ...source(5, () => true) });
    expect(read).toEqual({ taken: [1, 2], examined: 2, dry: false });
  });

  test("rows running out is dry, and keeps what it found", async () => {
    const read = await readBatches({
      need: 4,
      budget: readBudget(3),
      ...source(3, (row) => row !== 2),
    });
    expect(read).toEqual({ taken: [1, 3], examined: 3, dry: true });
  });
});

const ids = (people: OrderEntry[]) => people.map((entry) => entry.id);
const entries = (...names: string[]) => names.map((id) => ({ id }));

describe("buildPeopleOrder", () => {
  test("keeps the sections in order, each tagged", () => {
    const { people, capped } = buildPeopleOrder(
      [
        { section: "mutual", people: entries("m1", "m2") },
        { section: "oneWay", people: entries("o1") },
        { people: entries("t1", "t2") },
      ],
      undefined,
    );
    expect(people).toEqual([
      { id: "m1", section: "mutual" },
      { id: "m2", section: "mutual" },
      { id: "o1", section: "oneWay" },
      { id: "t1" },
      { id: "t2" },
    ]);
    expect(capped).toBe(false);
  });

  test("a person in two sections keeps the first place", () => {
    const { people } = buildPeopleOrder(
      [
        {
          section: "mutual",
          people: [{ id: "a", rank: { mutual: 2, sum: 4, at: 1, userId: "a" } }],
        },
        { section: "oneWay", people: entries("b", "a", "c") },
      ],
      undefined,
    );
    expect(people.map((entry) => [entry.id, entry.section])).toEqual([
      ["a", "mutual"],
      ["b", "oneWay"],
      ["c", "oneWay"],
    ]);
    expect(people[0]?.rank?.mutual).toBe(2);
  });

  test("leaves out the lead", () => {
    const { people } = buildPeopleOrder(
      [{ section: "oneWay", people: entries("a", "lead") }, { people: entries("lead", "b") }],
      "lead",
    );
    expect(ids(people)).toEqual(["a", "b"]);
  });

  test("stops at the cap and says so", () => {
    const sections = [
      { section: "mutual" as const, people: entries("a", "b") },
      { people: entries("c", "d") },
    ];
    const cut = buildPeopleOrder(sections, undefined, 3);
    expect(ids(cut.people)).toEqual(["a", "b", "c"]);
    expect(cut.capped).toBe(true);
    expect(buildPeopleOrder(sections, undefined, 4).capped).toBe(false);
  });

  test("repeats and the lead don't count toward the cap", () => {
    const { people, capped } = buildPeopleOrder(
      [{ section: "mutual", people: entries("a", "lead") }, { people: entries("a", "b") }],
      "lead",
      2,
    );
    expect(ids(people)).toEqual(["a", "b"]);
    expect(capped).toBe(false);
  });
});

describe("nextSlice", () => {
  const people = entries("a", "b", "c");

  test("reads from the position", () => {
    expect(ids(nextSlice(people, 1, 5))).toEqual(["b", "c"]);
    expect(ids(nextSlice(people, 0, 2))).toEqual(["a", "b"]);
  });

  test("is empty past the end", () => {
    expect(nextSlice(people, 3, 5)).toEqual([]);
    expect(nextSlice(people, 7, 5)).toEqual([]);
  });
});

describe("resumeAt", () => {
  const order: OrderEntry[] = [
    { id: "m1", section: "mutual" },
    { id: "m2", section: "mutual" },
    { id: "o1", section: "oneWay" },
    { id: "t1" },
    { id: "t2" },
  ];

  test("goes on after the cursor's person when they are in the order", () => {
    expect(resumeAt(order, { userId: "o1", at: 1 })).toBe(3);
    expect(resumeAt(order, { userId: "t2" })).toBe(5);
  });

  test("else at the cursor's position, never past the end", () => {
    expect(resumeAt(order, { userId: "gone", at: 2 })).toBe(2);
    expect(resumeAt(order, { userId: "gone", at: 9 })).toBe(5);
  });

  test("an open tab's cursor with only a phase starts that section", () => {
    expect(resumeAt(order, { userId: "gone", phase: "mutual" })).toBe(0);
    expect(resumeAt(order, { userId: "gone", phase: "oneWay" })).toBe(2);
    expect(resumeAt(order, { userId: "gone", phase: "tail" })).toBe(3);
  });

  test("an open tab's cursor with only a rank starts at the top, where Mutual starts", () => {
    const cursor = { userId: "gone", rank: { mutual: 1, sum: 2, at: 0, userId: "gone" } };
    expect(resumeAt(order, cursor)).toBe(0);
  });

  test("a section with no one in it starts the next one", () => {
    const noOneWay = order.filter((entry) => entry.section !== "oneWay");
    expect(resumeAt(noOneWay, { userId: "gone", phase: "oneWay" })).toBe(2);
    expect(resumeAt(entries("m1"), { userId: "gone", phase: "tail" })).toBe(0);
    expect(resumeAt([{ id: "m1", section: "mutual" }], { userId: "gone", phase: "tail" })).toBe(1);
  });

  test("a cursor with nothing to go on starts at the top", () => {
    expect(resumeAt(order, { userId: "gone" })).toBe(0);
  });
});

describe("ordersFingerprint", () => {
  const base = {
    facets: { artist: ["tripleS", "artms"], member: [], season: ["Atom01"] },
    type: "all" as const,
    slug: null,
    mode: "any" as const,
    listId: 4,
    lead: null,
  };

  test("is the same in any key or value order", () => {
    const shuffled = {
      ...base,
      facets: { season: ["Atom01"], member: [], artist: ["artms", "tripleS"] },
    };
    expect(ordersFingerprint(shuffled)).toBe(ordersFingerprint(base));
  });

  test("differs when a filter, the mode, the Compare with list or the lead does", () => {
    const fingerprint = ordersFingerprint(base);
    for (const other of [
      { ...base, facets: { ...base.facets, member: ["SeoYeon"] } },
      { ...base, type: "wtt" as const },
      { ...base, slug: "atom01-seoyeon-204z" },
      { ...base, mode: "mutual" as const },
      { ...base, listId: null },
      { ...base, lead: "u1" },
    ]) {
      expect(ordersFingerprint(other)).not.toBe(fingerprint);
    }
  });
});

describe("orderReader", () => {
  const keyset = (userId: string, minute: number) => ({
    userId,
    bumpedAt: new Date(Date.UTC(2026, 9, 1, 0, 60 - minute)).toISOString(),
  });
  /** the tail past the cap, newest first, read by keyset */
  const past = [keyset("x1", 1), keyset("x2", 2), keyset("x3", 3)];
  const fetchMore =
    (calls: (string | undefined)[]) =>
    async (after: { userId: string } | undefined, limit: number) => {
      calls.push(after?.userId);
      const from = after ? past.findIndex((row) => row.userId === after.userId) + 1 : 0;
      return past.slice(from, from + limit);
    };
  const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

  test("an uncapped order reads its entries and is exhausted at its end", async () => {
    const calls: (string | undefined)[] = [];
    const reader = orderReader({ people: entries("a", "b", "c") }, 1, undefined, fetchMore(calls));
    expect(await reader.fetch(1)).toEqual({ rows: [{ id: "b" }], exhausted: false });
    expect(await reader.fetch(5)).toEqual({ rows: [{ id: "c" }], exhausted: true });
    expect(reader.position()).toBe(3);
    expect(await reader.fetch(5)).toEqual({ rows: [], exhausted: true });
    expect(calls).toEqual([]);
  });

  test("at a capped order's end it goes on by keyset from `more`", async () => {
    const calls: (string | undefined)[] = [];
    const order = { people: entries("a", "b"), more: { after: keyset("b", 0) } };
    const reader = orderReader(order, 0, undefined, fetchMore(calls));
    expect(await reader.fetch(2)).toEqual({ rows: entries("a", "b"), exhausted: false });
    const next = await reader.fetch(2);
    expect(ids(next.rows)).toEqual(["x1", "x2"]);
    expect(next.rows[0]?.bumpedAt).toBe(past[0]?.bumpedAt);
    expect(next.exhausted).toBe(false);
    expect(await reader.fetch(2)).toMatchObject({ rows: [{ id: "x3" }], exhausted: true });
    expect(calls).toEqual(["b", "x2"]);
    expect(reader.position()).toBe(5);
  });

  test("a capped order with no tail kept reads the tail from its top", async () => {
    const calls: (string | undefined)[] = [];
    const reader = orderReader({ people: entries("a"), more: {} }, 1, undefined, fetchMore(calls));
    expect(ids((await reader.fetch(1)).rows)).toEqual(["x1"]);
    expect(calls).toEqual([undefined]);
  });

  test("a cursor resumed at the order's end goes on from `more`, not its own person", async () => {
    const calls: (string | undefined)[] = [];
    const order = { people: entries("a", "b"), more: { after: keyset("b", 0) } };
    const reader = orderReader(order, 2, keyset("x2", 2), fetchMore(calls));
    expect(ids((await reader.fetch(1)).rows)).toEqual(["x1"]);
    expect(calls).toEqual(["b"]);
  });

  test("a cursor already past the order goes on from the cursor's person", async () => {
    const calls: (string | undefined)[] = [];
    const order = { people: entries("a", "b"), more: { after: keyset("b", 0) } };
    const reader = orderReader(order, 3, keyset("x1", 1), fetchMore(calls));
    expect(ids((await reader.fetch(5)).rows)).toEqual(["x2", "x3"]);
    expect(calls).toEqual(["x1"]);
    expect(reader.position()).toBe(5);
  });

  test("one page reads past the order's end into the keyset", async () => {
    const reader = orderReader(
      { people: entries("a", "b"), more: { after: keyset("b", 0) } },
      1,
      undefined,
      fetchMore([]),
    );
    const read = await readBatches({
      need: 3,
      budget: readBudget(3),
      fetch: reader.fetch,
      load: async (rows) => rows.map((row) => row.id),
    });
    expect(read.taken).toEqual(["b", "x1", "x2"]);
    expect(read.examined?.id).toBe("x2");
    expect(read.dry).toBe(false);
    expect(reader.position()).toBe(4);
  });
});

describe("ruleTiles", () => {
  test("one tile per rule, oldest first, counting the viewer's matches", () => {
    const entries = [
      { id: 1, slug: "a", objektId: null },
      { id: 2, slug: "b", objektId: null, ruleId: 9 },
      { id: 3, slug: "c", objektId: null, ruleId: 4 },
      { id: 4, slug: "d", objektId: null, ruleId: 9 },
    ];
    const index = new Map([
      ["b", [1]],
      ["d", [1]],
      ["a", [1]],
    ]);
    expect(ruleTiles(entries, index)).toEqual([
      { ruleId: 4, count: 1, matched: 0, matchedSlugs: [] },
      { ruleId: 9, count: 2, matched: 2, matchedSlugs: ["b", "d"] },
    ]);
    expect(ruleTiles(entries, null)).toEqual([
      { ruleId: 4, count: 1, matched: 0, matchedSlugs: [] },
      { ruleId: 9, count: 2, matched: 0, matchedSlugs: [] },
    ]);
  });
});

describe("ruleMatchesOf", () => {
  const entry = (id: number, slug: string) => ({ id, slug, objektId: null });
  const ruleWant = new Map([
    ["lynn-366", [{ ruleId: 1, listId: 10 }]],
    ["kaede-118", [{ ruleId: 2, listId: 10 }]],
  ]);

  test("names each collection matched only through a rule, once, swap when a have list holds it", () => {
    const index = new Map([
      ["lynn-366", [10]],
      ["kaede-118", [10]],
      ["kotone-302", [10]],
    ]);
    expect(
      ruleMatchesOf(
        [
          { role: "sale", entries: [entry(1, "lynn-366")], index },
          { role: "have", entries: [entry(2, "lynn-366"), entry(3, "kotone-302")], index },
        ],
        ruleWant,
      ),
    ).toEqual([{ slug: "lynn-366", ruleId: 1, listId: 10, swap: true }]);
  });

  test("a side the viewer's lists can't match names nothing", () => {
    expect(
      ruleMatchesOf(
        [{ role: "have", entries: [entry(1, "kaede-118")], index: new Map() }],
        ruleWant,
      ),
    ).toEqual([]);
  });
});

describe("Sell or swap posts", () => {
  test("a sale list that takes swaps folds its want list into one WTS and WTT post", () => {
    const sale = list({ id: 1, listType: "sale", takesSwaps: true, linkedListId: 2 });
    const want = list({ id: 2, listType: "want", matchSale: false, linkedListId: 1 });
    const [post, ...rest] = pairPosts([sale, want]);
    expect(rest).toEqual([]);
    expect(post).toMatchObject({
      anchor: { id: 1 },
      sale: { id: 1 },
      want: { id: 2 },
      tags: ["wts", "wtt"],
    });
  });

  test("a Sell only sale list stays its own post", () => {
    const sale = list({ id: 1, listType: "sale", linkedListId: 2 });
    const want = list({ id: 2, listType: "want", matchSale: false, linkedListId: 1 });
    expect(pairPosts([sale, want]).map((post) => post.tags)).toEqual([["wts"], ["wtt"]]);
  });
});

describe("ruleMatchesOf picks the rule of the list that matched", () => {
  test("two rules on two lists want a slug; the compared one is named", () => {
    const ruleWant = new Map([
      [
        "x",
        [
          { ruleId: 1, listId: 10 },
          { ruleId: 2, listId: 20 },
        ],
      ],
    ]);
    const side = { role: "have" as const, entries: [{ id: 1, slug: "x", objektId: null }] };
    expect(ruleMatchesOf([{ ...side, index: new Map([["x", [20]]]) }], ruleWant)).toEqual([
      { slug: "x", ruleId: 2, listId: 20, swap: true },
    ]);
  });
});

describe("side order", () => {
  const roles = (lists: TradeList[]) => {
    const [post] = pairPosts(lists);
    return assemblePost(post!, (id) => [entry(id * 10, `s${id}`)], null, NO_FILTER)?.sides.map(
      (side) => side.role,
    );
  };

  test("what the poster gives comes before what they want", () => {
    expect(
      roles([
        list({ id: 2, listType: "want", linkedListId: 1 }),
        list({ id: 1, listType: "have", linkedListId: 2 }),
      ]),
    ).toEqual(["have", "want"]);
    expect(
      roles([
        list({ id: 2, listType: "want", linkedListId: 1 }),
        list({ id: 1, listType: "sale", linkedListId: 2, takesSwaps: true }),
      ]),
    ).toEqual(["sale", "want"]);
  });
});

describe("fullSide", () => {
  const none = new Map<string, number[]>();
  // the viewer wants "a" and "c" on swaps-only want list 9, and "d" on Buying only list 10
  const viewer: Viewer = {
    have: none,
    tradeHave: none,
    saleHave: none,
    want: new Map([
      ["a", [9]],
      ["c", [9]],
      ["d", [10]],
    ]),
    tradeWant: new Map([
      ["a", [9]],
      ["c", [9]],
    ]),
    saleWant: new Map([["d", [10]]]),
  };
  const entries = [entry(1, "a"), entry(2, "b"), entry(3, "c"), entry(4, "c"), entry(5, "d")];
  const slugs = (side: ReturnType<typeof fullSide>) => side.items.map((item) => item.slug);

  test("lists every collection, ringed ones first, copies stacked", () => {
    const side = fullSide("have", list({ id: 1, listType: "have" }), entries, viewer);
    expect(slugs(side)).toEqual(["c", "a", "d", "b"]);
    expect(side.items.filter((item) => item.ringed).map((item) => item.slug)).toEqual(["c", "a"]);
    expect(side.items[0]).toMatchObject({ slug: "c", qty: 2 });
    expect(side).toMatchObject({ matched: 2, more: 0, copyCount: 5 });
  });

  test("rings by the side's role: a sale list that takes swaps rings every want list", () => {
    expect(fullSide("sale", list({ id: 1, listType: "sale" }), entries, viewer).matched).toBe(1);
    expect(
      fullSide("sale", list({ id: 1, listType: "sale", takesSwaps: true }), entries, viewer)
        .matched,
    ).toBe(3);
  });

  test("counts past the limit, and every match however many are drawn", () => {
    const side = fullSide("have", list({ id: 1, listType: "have" }), entries, viewer, 1);
    expect(slugs(side)).toEqual(["c"]);
    expect(side).toMatchObject({ more: 3, matched: 2 });
  });

  test("leaves a rule's entries to its tile, and rings nothing signed out", () => {
    const side = fullSide(
      "want",
      list({ id: 1, listType: "want" }),
      [entry(1, "a"), { ...entry(2, "b"), ruleId: 5 }],
      null,
    );
    expect(slugs(side)).toEqual(["a"]);
    expect(side.matched).toBe(0);
  });
});
describe("listMatchesOf", () => {
  const none = new Map<string, number[]>();
  // want list 9 is swaps only, 10 Buying only; have list 7, sale list 8
  const viewer: Viewer = {
    have: new Map([
      ["x", [7]],
      ["y", [8]],
    ]),
    tradeHave: new Map([["x", [7]]]),
    saleHave: new Map([["y", [8]]]),
    want: new Map([
      ["a", [9]],
      ["b", [10]],
    ]),
    tradeWant: new Map([["a", [9]]]),
    saleWant: new Map([["b", [10]]]),
  };
  const entries = [entry(1, "a"), entry(2, "a"), entry(3, "b"), entry(4, "x"), entry(5, "y")];

  test("a have list matches the viewer's want lists open to swaps, once per collection", () => {
    expect(listMatchesOf("have", list({ id: 1, listType: "have" }), entries, viewer)).toEqual({
      slugs: ["a"],
      listIds: [9],
    });
  });

  test("a sale list that takes swaps matches every want list", () => {
    const sale = list({ id: 1, listType: "sale", takesSwaps: true });
    expect(listMatchesOf("sale", sale, entries, viewer)).toEqual({
      slugs: ["a", "b"],
      listIds: [9, 10],
    });
  });

  test("a want list matches by its Open to", () => {
    const swaps = list({ id: 1, listType: "want", matchHave: true, matchSale: false });
    expect(listMatchesOf("want", swaps, entries, viewer).slugs).toEqual(["x"]);
    const both = list({ id: 1, listType: "want" });
    expect(listMatchesOf("want", both, entries, viewer)).toEqual({
      slugs: ["x", "y"],
      listIds: [7, 8],
    });
  });

  test("a rule's entries are left out, as the list page's grid leaves them out", () => {
    const withRule = [entry(1, "x"), { ...entry(2, "y"), ruleId: 4 }];
    const both = list({ id: 1, listType: "want" });
    expect(listMatchesOf("want", both, withRule, viewer)).toEqual({ slugs: ["x"], listIds: [7] });
  });

  test("nothing matches, nothing back", () => {
    const empty = { ...viewer, tradeWant: none };
    expect(listMatchesOf("have", list({ id: 1, listType: "have" }), entries, empty)).toEqual({
      slugs: [],
      listIds: [],
    });
  });
});
