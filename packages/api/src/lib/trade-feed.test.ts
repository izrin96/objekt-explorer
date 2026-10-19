import { describe, expect, test } from "bun:test";

import { PREVIEW_LIMIT, SOLO_PREVIEW_LIMIT } from "../schemas/trade";
import {
  assemblePost,
  browseMode,
  comparePosts,
  cursorScope,
  type FeedEntry,
  type FeedPhase,
  feedPlan,
  fillPage,
  readBudget,
  isSectioned,
  isPostIdle,
  matchesViewer,
  mergeSeen,
  narrowViewer,
  nextBumpAt,
  pairPosts,
  phaseAfter,
  peopleScope,
  phaseScope,
  previewSide,
  type TradeList,
  tradeableEntries,
  untradeableKey,
  type Viewer,
} from "./trade-feed";

const NOW = new Date("2026-10-07T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

const list = (over: Partial<TradeList> & Pick<TradeList, "id" | "listTypeNew">): TradeList => ({
  userId: "u1",
  linkedListId: null,
  matchSale: true,
  matchHave: true,
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

  test("a want list alone that also matches sales is WTB, a sale list WTS", () => {
    const tags = pairPosts([
      list({ id: 2, listTypeNew: "want", linkedListId: 1, matchSale: true }),
      list({ id: 3, listTypeNew: "sale" }),
    ]).map((post) => post.tag);
    expect(tags).toEqual(["wtb", "wts"]);
  });

  test("a want list alone that matches trades only is WTT", () => {
    const [post] = pairPosts([list({ id: 2, listTypeNew: "want", matchSale: false })]);
    expect(post).toMatchObject({ tag: "wtt", have: null });
  });

  test("a want list alone that is Buying only is WTB and notes it", () => {
    const [post] = pairPosts([list({ id: 2, listTypeNew: "want", matchHave: false })]);
    expect(post).toMatchObject({ tag: "wtb", buyingOnly: true });
    const [open] = pairPosts([list({ id: 3, listTypeNew: "want" })]);
    expect(open).toMatchObject({ tag: "wtb", buyingOnly: false });
  });

  test("a have list linked to a Buying only want list is one WTT post", () => {
    const posts = pairPosts([
      list({ id: 1, listTypeNew: "have", linkedListId: 2 }),
      list({ id: 2, listTypeNew: "want", linkedListId: 1, matchHave: false }),
    ]);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ tag: "wtt", buyingOnly: false });
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
    list({ id: 1, listTypeNew: "have", linkedListId: 2 }),
    list({ id: 2, listTypeNew: "want" }),
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
    const [solo] = pairPosts([list({ id: 3, listTypeNew: "sale" })]);
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
    const [sale] = pairPosts([list({ id: 3, listTypeNew: "sale" })]);
    const post = assemblePost(sale!, () => [entry(30, "offer-b")], tradeOnly, NO_FILTER);
    expect(post?.match).toEqual({ youHave: 0, youWant: 0, haveListIds: [], wantListIds: [] });
    expect(post?.sides[0]?.items.some((item) => item.ringed)).toBe(false);
  });

  test("a want list that trades only matches the viewer's have lists, not their sale lists", () => {
    const [tradeOnlyPair] = pairPosts([
      list({ id: 1, listTypeNew: "have", linkedListId: 2 }),
      list({ id: 2, listTypeNew: "want", matchSale: false }),
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
    const [post] = pairPosts([list({ id: 1, listTypeNew: "have" })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["a"]);
  });

  test("a Buying only want post rings only against my sale lists", () => {
    const [post] = pairPosts([list({ id: 2, listTypeNew: "want", matchHave: false })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["b"]);
  });

  test("a swaps-only want post rings only against my have lists", () => {
    const [post] = pairPosts([list({ id: 2, listTypeNew: "want", matchSale: false })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["a"]);
  });

  test("a want post open to both rings against my have and sale lists", () => {
    const [post] = pairPosts([list({ id: 2, listTypeNew: "want" })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["b", "a"]);
  });

  test("a sale post rings only against my want lists open to buying", () => {
    const [post] = pairPosts([list({ id: 3, listTypeNew: "sale" })]);
    expect(ringed(post!)?.map((item) => item.slug)).toEqual(["b"]);
  });

  test("a viewer with only a Buying only want list matches no have post", () => {
    const [post] = pairPosts([list({ id: 1, listTypeNew: "have" })]);
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

describe("peopleScope", () => {
  const seen = { mutual: ["m1", "m2"], oneWay: ["o1", "m1"] };

  test("Mutual leaves out only the lead person", () => {
    expect(peopleScope("mutual", seen)).toEqual([]);
    expect(peopleScope("mutual", seen, "p")).toEqual(["p"]);
  });

  test("One way leaves out every Mutual person, the tail also every One way person", () => {
    expect(peopleScope("oneWay", seen, "p")).toEqual(["p", "m1", "m2"]);
    expect(peopleScope("tail", seen)).toEqual(["m1", "m2", "o1"]);
  });

  test("the plain bump order leaves out only the lead person", () => {
    expect(peopleScope("bump", seen, "p")).toEqual(["p"]);
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
