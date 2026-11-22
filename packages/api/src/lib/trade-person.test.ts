import { describe, expect, test } from "bun:test";

import { type MatchCounts, countsFit, mutualOf } from "../schemas/trade";
import {
  type MatchPosts,
  matchCounts,
  type PostOf,
  swapScore,
  viewerListIds,
} from "./trade-person";

/** Posts keyed as before rows: each list's one post key is its row, and that row's lead is itself. */
const keyed = (mine: Record<number, number>, theirs: Record<number, number>): MatchPosts => {
  const wrap = (keys: Record<number, number>): PostOf =>
    Object.fromEntries(Object.entries(keys).map(([id, key]) => [id, [key]]));
  const leads = Object.fromEntries(
    [...Object.values(mine), ...Object.values(theirs)].map((key) => [key, key]),
  );
  return { mine: wrap(mine), theirs: wrap(theirs), leads };
};

const match = (slug: string, trade: boolean, myListIds: number[] = []) => ({
  slug,
  trade,
  myListIds,
  swapMyListIds: trade ? myListIds : [],
  swapPartnerListIds: trade ? [10] : [],
});

const ONE_POST = keyed({ 1: 1, 2: 1 }, { 10: 10 });

const counts = (over: Partial<MatchCounts>): MatchCounts => ({
  theyHave: 0,
  youHave: 0,
  swap: 0,
  swapTheyHave: 0,
  swapPair: null,
  ...over,
});

describe("matchCounts", () => {
  test("counts distinct collections per direction", () => {
    const result = matchCounts({
      theyHaveIWant: [match("a", true, [2]), match("a", true, [2]), match("b", false)],
      iHaveTheyWant: [match("c", true, [1])],
      posts: ONE_POST,
    });
    expect(result).toEqual({
      theyHave: 2,
      youHave: 1,
      swap: 1,
      swapTheyHave: 1,
      swapPair: { myListIds: [1, 2], theirPostId: 10 },
    });
  });

  test("every match counts toward the one-way counts", () => {
    const result = matchCounts({
      theyHaveIWant: [match("a", false), match("b", false)],
      iHaveTheyWant: [match("c", false)],
      posts: ONE_POST,
    });
    expect(result).toEqual(counts({ theyHave: 2, youHave: 1 }));
  });

  test("viewerListIds gathers each direction's lists once", () => {
    expect(
      viewerListIds({
        theyHaveIWant: [match("a", true, [1, 2]), match("b", true, [2])],
        iHaveTheyWant: [match("c", true, [9])],
      }),
    ).toEqual({ wantListIds: [1, 2], haveListIds: [9] });
  });
});

describe("swapScore", () => {
  // the viewer's posts: P1 is "jiwoo spares" (1) with "doubles hunt" (2), P2 "yooyeon spares" (3)
  // with "hyerin and kaede" (4); "wishlist" (5) has no link
  const mine = { 1: 1, 2: 1, 3: 3, 4: 3 };
  // the person's one post: have list 10 with want list 11
  const theirs = { 10: 10, 11: 10 };
  const swapMatch = (slug: string, myList: number, theirList: number) => ({
    slug,
    trade: true,
    myListIds: [myList],
    swapMyListIds: [myList],
    swapPartnerListIds: [theirList],
  });
  const score = (
    theyHave: [string, number][],
    youHave: [string, number][],
    posts: MatchPosts = keyed(mine, theirs),
  ) =>
    swapScore({
      theyHaveIWant: theyHave.map(([slug, myList]) => swapMatch(slug, myList, 10)),
      iHaveTheyWant: youHave.map(([slug, myList]) => swapMatch(slug, myList, 11)),
      posts,
    });

  test("Jun: both halves on P2 swap", () => {
    expect(score([["hyerin-302z", 4]], [["yooyeon-205z", 3]])).toEqual({
      swap: 1,
      swapTheyHave: 1,
      swapPair: { myListIds: [3, 4], theirPostId: 10 },
    });
  });

  test("Rae: a rule on P1's want list against P1's have list swaps", () => {
    expect(score([["kaede-318z", 2]], [["jiwoo-204z", 1]])).toMatchObject({
      swap: 1,
      swapPair: { myListIds: [1, 2], theirPostId: 10 },
    });
  });

  test("Mina: what P1 wants against what P2 has is no swap", () => {
    expect(
      score(
        [
          ["seoyeon-401z", 2],
          ["nakyoung-302z", 2],
        ],
        [["yooyeon-205z", 3]],
      ),
    ).toEqual({ swap: 0, swapTheyHave: 0, swapPair: null });
  });

  test("Sora: the viewer's unlinked want list is no swap", () => {
    expect(score([["kotone-110z", 5]], [["jiwoo-204z", 1]])).toEqual({
      swap: 0,
      swapTheyHave: 0,
      swapPair: null,
    });
  });

  test("the best pairing wins, with its own they-have count", () => {
    expect(
      score(
        [
          ["a", 2],
          ["b", 4],
          ["c", 4],
          ["d", 4],
        ],
        [
          ["x", 1],
          ["y", 3],
          ["z", 3],
        ],
      ),
    ).toEqual({ swap: 2, swapTheyHave: 3, swapPair: { myListIds: [3, 4], theirPostId: 10 } });
  });

  test("a person's two posts split across directions are no swap", () => {
    // their post A (have 10, want 11) holds what P1 wants; their post B (have 20, want 21) wants
    // what P1 has
    const result = swapScore({
      theyHaveIWant: [swapMatch("a", 2, 10)],
      iHaveTheyWant: [swapMatch("x", 1, 21)],
      posts: keyed(mine, { 10: 10, 11: 10, 20: 20, 21: 20 }),
    });
    expect(result).toEqual({ swap: 0, swapTheyHave: 0, swapPair: null });
  });

  test("the person's unlinked lists are no swap", () => {
    expect(score([["a", 2]], [["x", 1]], keyed(mine, {}))).toEqual({
      swap: 0,
      swapTheyHave: 0,
      swapPair: null,
    });
  });

  test("the viewer's unlinked have and want lists are no swap", () => {
    // have 6 and want 7 carry no post key
    expect(score([["a", 7]], [["x", 6]])).toEqual({ swap: 0, swapTheyHave: 0, swapPair: null });
  });

  test("a collection on two of the person's posts counts in each", () => {
    const result = swapScore({
      theyHaveIWant: [{ ...swapMatch("a", 2, 10), swapPartnerListIds: [10, 20] }],
      iHaveTheyWant: [swapMatch("x", 1, 21)],
      posts: keyed(mine, { 10: 10, 11: 10, 20: 20, 21: 20 }),
    });
    expect(result).toEqual({
      swap: 1,
      swapTheyHave: 1,
      swapPair: { myListIds: [1, 2], theirPostId: 20 },
    });
  });

  test("a full tie goes to the lowest post keys, whatever order the matches came in", () => {
    // P2 swaps 1 for 1 with the person's post 10 and with their post 20
    const theyHave = [swapMatch("a", 4, 20), swapMatch("b", 4, 10)];
    const youHave = [swapMatch("x", 3, 21), swapMatch("y", 3, 11)];
    const posts = keyed(mine, { 10: 10, 11: 10, 20: 20, 21: 20 });
    for (const order of [(m: typeof theyHave) => m, (m: typeof theyHave) => m.toReversed()]) {
      expect(
        swapScore({ theyHaveIWant: order(theyHave), iHaveTheyWant: order(youHave), posts }),
      ).toEqual({ swap: 1, swapTheyHave: 1, swapPair: { myListIds: [3, 4], theirPostId: 10 } });
    }
  });
});

describe("mutual", () => {
  test("is the per-post swap score, not the pooled one", () => {
    expect(mutualOf(counts({ theyHave: 2, youHave: 1, swap: 0 }))).toBe(0);
    expect(mutualOf(counts({ theyHave: 3, youHave: 2, swap: 1 }))).toBe(1);
  });

  test("a sale list answered by a buying want list is not mutual", () => {
    expect(countsFit("mutual", counts({ theyHave: 3, youHave: 2 }))).toBe(false);
  });

  test("swaps across posts are not mutual", () => {
    const crossPost = counts({ theyHave: 2, youHave: 1 });
    expect(countsFit("mutual", crossPost)).toBe(false);
    expect(countsFit("all", crossPost)).toBe(true);
  });

  test("the one-way fits still count sale matches", () => {
    const sale = counts({ theyHave: 3 });
    expect(countsFit("they_have", sale)).toBe(true);
    expect(countsFit("they_want", sale)).toBe(false);
    expect(countsFit("all", sale)).toBe(true);
  });
});

describe("swapScore over rows", () => {
  const swap = (slug: string, myList: number, theirList: number) => ({
    slug,
    trade: true,
    myListIds: [myList],
    swapMyListIds: [myList],
    swapPartnerListIds: [theirList],
  });
  // the viewer's post: row 3 holds have list 3 and want list 4
  const mine: PostOf = { 3: [3], 4: [3] };

  test("a partner have list in two pair rows swaps through the row whose want list matches", () => {
    // have list 10 leads row 100 with want list 11 and row 101 with want list 12
    const posts: MatchPosts = {
      mine,
      theirs: { 10: [100, 101], 11: [100], 12: [101] },
      leads: { 3: 3, 100: 10, 101: 10 },
    };
    const result = swapScore({
      theyHaveIWant: [swap("hyerin-302z", 4, 10)],
      iHaveTheyWant: [swap("yooyeon-205z", 3, 12)],
      posts,
    });
    // swapPair names the row, not the lead list both rows share
    expect(result).toEqual({
      swap: 1,
      swapTheyHave: 1,
      swapPair: { myListIds: [3, 4], theirPostId: 101 },
    });
    // through the other want list, the same lead names the other row's pairing
    expect(
      swapScore({
        theyHaveIWant: [swap("hyerin-302z", 4, 10)],
        iHaveTheyWant: [swap("yooyeon-205z", 3, 11)],
        posts,
      }).swap,
    ).toBe(1);
  });

  test("a tie goes to the pairing the lead ids name, and swapPair names its row", () => {
    // row 100 is led by list 20, row 101 by list 10: as before rows, the lower lead wins
    const posts: MatchPosts = {
      mine,
      theirs: { 20: [100], 21: [100], 10: [101], 11: [101] },
      leads: { 3: 3, 100: 20, 101: 10 },
    };
    const result = swapScore({
      theyHaveIWant: [swap("a", 4, 20), swap("b", 4, 10)],
      iHaveTheyWant: [swap("x", 3, 21), swap("y", 3, 11)],
      posts,
    });
    expect(result.swapPair).toEqual({ myListIds: [3, 4], theirPostId: 101 });
  });
});
