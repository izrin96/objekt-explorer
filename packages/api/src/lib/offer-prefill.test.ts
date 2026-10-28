import { describe, expect, test } from "bun:test";

import type { CandidateItem } from "../schemas/offer";
import {
  chooseMatchPicks,
  fillMatches,
  itemsOnLists,
  matchesThrough,
  nearGroups,
  type PartnerEntry,
  postSides,
} from "./offer-prefill";
import { matchCounts } from "./trade-person";

function item(
  slug: string,
  serial: number | null,
  over: Partial<CandidateItem> = {},
): CandidateItem {
  return {
    collectionSlug: slug,
    objektId: serial === null ? null : `${slug}-${serial}`,
    serial,
    serialEstimated: false,
    transferable: true,
    reserved: false,
    inOpenOffer: [],
    listSlug: "doubles",
    copies: serial === null ? 2 : null,
    bySerial: false,
    ...over,
  };
}

const ids = (items: CandidateItem[]) => items.map((i) => i.objektId);

describe("chooseMatchPicks", () => {
  test("gives the highest serial", () => {
    const { give } = chooseMatchPicks(
      [{ slug: "204z", items: [item("204z", 12), item("204z", 537)] }],
      [],
    );
    expect(ids(give)).toEqual(["204z-537"]);
  });

  test("a copy in another open offer loses to one in none", () => {
    const { give } = chooseMatchPicks(
      [{ slug: "204z", items: [item("204z", 12), item("204z", 537, { inOpenOffer: [7] })] }],
      [],
    );
    expect(ids(give)).toEqual(["204z-12"]);
  });

  test("falls back to a copy in another open offer when it is the only one", () => {
    const { give } = chooseMatchPicks(
      [{ slug: "204z", items: [item("204z", 537, { inOpenOffer: [7] })] }],
      [],
    );
    expect(ids(give)).toEqual(["204z-537"]);
  });

  test("never chooses a reserved or non-transferable copy", () => {
    const { give, get, matched } = chooseMatchPicks(
      [{ slug: "204z", items: [item("204z", 900, { reserved: true }), item("204z", 3)] }],
      [{ slug: "302z", items: [item("302z", 1, { transferable: false })] }],
    );
    expect(ids(give)).toEqual(["204z-3"]);
    expect(get).toEqual([]);
    expect(matched).toEqual({ give: 1, get: 0 });
  });

  test("asks for any copy over a serial", () => {
    const { get } = chooseMatchPicks(
      [],
      [{ slug: "302z", items: [item("302z", 88), item("302z", null)] }],
    );
    expect(get).toHaveLength(1);
    expect(get[0]!.objektId).toBeNull();
  });

  test("gives a numbered copy over one with no serial", () => {
    const { give } = chooseMatchPicks(
      [
        {
          slug: "204z",
          items: [item("204z", null, { objektId: "t1", copies: null }), item("204z", 4)],
        },
      ],
      [],
    );
    expect(ids(give)).toEqual(["204z-4"]);
  });

  test("asks for a numbered copy over one with no serial", () => {
    const { get } = chooseMatchPicks(
      [],
      [
        {
          slug: "302z",
          items: [item("302z", null, { objektId: "t1", copies: null }), item("302z", 88)],
        },
      ],
    );
    expect(ids(get)).toEqual(["302z-88"]);
  });

  test("asks for the lowest serial", () => {
    const { get } = chooseMatchPicks(
      [],
      [{ slug: "302z", items: [item("302z", 140), item("302z", 88)] }],
    );
    expect(ids(get)).toEqual(["302z-88"]);
  });

  test("caps each side at 50 and counts every eligible match", () => {
    const give = Array.from({ length: 60 }, (_, n) => ({
      slug: `c${n}`,
      items: [item(`c${n}`, n + 1)],
    }));
    const picks = chooseMatchPicks(give, [{ slug: "302z", items: [item("302z", 5)] }]);
    expect(picks.give).toHaveLength(50);
    expect(picks.matched).toEqual({ give: 60, get: 1 });
  });

  test("keeps the order the matches came in", () => {
    const { give } = chooseMatchPicks(
      [
        { slug: "b", items: [item("b", 1)] },
        { slug: "a", items: [item("a", 1)] },
        { slug: "c", items: [item("c", 1)] },
      ],
      [],
    );
    expect(give.map((i) => i.collectionSlug)).toEqual(["b", "a", "c"]);
  });

  test("a slug with nothing eligible drops out and isn't counted", () => {
    const { give, matched } = chooseMatchPicks(
      [
        { slug: "a", items: [item("a", 1, { reserved: true })] },
        { slug: "b", items: [] },
        { slug: "c", items: [item("c", 2)] },
      ],
      [],
    );
    expect(ids(give)).toEqual(["c-2"]);
    expect(matched.give).toBe(1);
  });
});

describe("postSides", () => {
  const row = (id: number, listType: "have" | "sale" | "want") => ({
    id,
    name: `list${id}`,
    listType,
  });

  test("a pair: its have list offers, its want list takes, named by the have list", () => {
    const sides = postSides([row(2, "want"), row(1, "have")]);
    expect([...sides.offerIds]).toEqual([1]);
    expect([...sides.wantIds]).toEqual([2]);
    expect(sides.name).toBe("list1");
  });

  test("a WTB post: its want list takes, named by it", () => {
    const sides = postSides([row(3, "want")]);
    expect([...sides.wantIds]).toEqual([3]);
    expect(sides.offerIds.size).toBe(0);
    expect(sides.name).toBe("list3");
  });
});

describe("matchesThrough", () => {
  const match = (slug: string, partnerListIds: number[], trade = true) => ({
    slug,
    myListIds: [9],
    partnerListIds,
    trade,
  });

  test("keeps swaps and sales alike, through the post's lists when it names them", () => {
    const matches = [match("a", [1]), match("b", [2]), match("c", [1], false)];
    expect(matchesThrough(matches, undefined).map((m) => m.slug)).toEqual(["a", "b", "c"]);
    expect(matchesThrough(matches, new Set([1])).map((m) => m.slug)).toEqual(["a", "c"]);
    expect(matchesThrough(matches, new Set())).toEqual([]);
  });
});

describe("fillMatches", () => {
  // the sender's posts: P1 (have 1, want 2) and P2 "extras" (have 3, want "binary hunt" 4)
  const mine = { 1: 1, 2: 1, 3: 3, 4: 3 };
  const swap = (slug: string, my: number[], partner: number[], swapMy = my) => ({
    slug,
    myListIds: my,
    partnerListIds: partner,
    trade: true,
    swapMyListIds: swapMy,
    swapPartnerListIds: partner,
  });
  const sale = (slug: string, my: number[], partner: number[]) => ({
    slug,
    myListIds: my,
    partnerListIds: partner,
    trade: false,
    swapMyListIds: [],
    swapPartnerListIds: [],
  });
  type M = ReturnType<typeof swap>;
  const person = (theyHaveIWant: M[], iHaveTheyWant: M[], theirs: Record<number, number>) => {
    const matched = { theyHaveIWant, iHaveTheyWant, posts: { mine, theirs } };
    return { matched, counts: matchCounts(matched) };
  };
  const slugs = (matches: M[]) => matches.map((match) => match.slug);
  const post = (offerIds: number[], wantIds: number[]) => ({
    offerIds: new Set(offerIds),
    wantIds: new Set(wantIds),
  });

  // jun.p's post (have 10, want 11): Hyerin for P2, 3 DCOs P1's rule wants, and wants Yooyeon
  // (P1 also holds Yooyeon, but as a sale-only entry, so it swaps through P2 alone)
  const junP = person(
    [
      swap("302z", [4], [10]),
      swap("dco1", [2], [10]),
      swap("dco2", [2], [10]),
      swap("dco3", [2], [10]),
    ],
    [swap("205z", [3, 1], [11], [3])],
    { 10: 10, 11: 10 },
  );

  test("a Can swap person: only the pair, each match cut to the pair's lists", () => {
    const { get, give } = fillMatches(junP.matched, junP.counts.swapPair);
    expect(slugs(get)).toEqual(["302z"]);
    expect(slugs(give)).toEqual(["205z"]);
    expect(give[0]!.myListIds).toEqual([3]);
    expect(get).toHaveLength(junP.counts.swapTheyHave);
  });

  test("both ways across posts: the bigger side only", () => {
    // mina.k: 2 DCOs on her have 20 for P1's rule; her want 21 takes Yooyeon from P2
    const mina = person(
      [swap("dco1", [2], [20]), swap("dco2", [2], [20])],
      [swap("205z", [3], [21])],
      { 20: 20, 21: 20 },
    );
    expect(mina.counts.swapPair).toBeNull();
    const { get, give } = fillMatches(mina.matched, mina.counts.swapPair);
    expect(slugs(get)).toEqual(["dco1", "dco2"]);
    expect(give).toEqual([]);
  });

  test("sales only: the bigger side, You give when it has more", () => {
    const seller = person([sale("a", [2], [30])], [sale("x", [1], [31]), sale("y", [1], [31])], {});
    const { get, give } = fillMatches(seller.matched, seller.counts.swapPair);
    expect(get).toEqual([]);
    expect(slugs(give)).toEqual(["x", "y"]);
  });

  test("a tie fills You get", () => {
    const tie = person(
      [sale("a", [2], [30]), sale("b", [2], [30])],
      [sale("x", [1], [31]), sale("y", [1], [31])],
      {},
    );
    const { get, give } = fillMatches(tie.matched, tie.counts.swapPair);
    expect(slugs(get)).toEqual(["a", "b"]);
    expect(give).toEqual([]);
  });

  // rin.trades: "doubles" (have 30) + "wants" (31) swap 3 with "extras"; "spares" (sale 32, open
  // to swaps, unpaired) has 2 the sender wants; "wants" also takes one from P1
  const rin = person(
    [
      swap("a", [4], [30]),
      swap("b", [4], [30]),
      swap("c", [4], [30]),
      swap("s1", [4], [32]),
      swap("s2", [4], [32]),
    ],
    [swap("x", [3], [31]), swap("y", [3], [31]), swap("z", [3], [31]), swap("w", [1], [31])],
    { 30: 30, 31: 30 },
  );

  test("the post that is the person's half of the pair: the pair's matches", () => {
    expect(rin.counts.swap).toBe(3);
    const { get, give } = fillMatches(rin.matched, rin.counts.swapPair, post([30], [31]));
    expect(slugs(get)).toEqual(["a", "b", "c"]);
    expect(slugs(give)).toEqual(["x", "y", "z"]);
  });

  test("from the row: the pair only, each match cut to the person's lists in it", () => {
    // "a" sits on "doubles" and "spares"; "w" swaps only through P1, "s1" only through "spares"
    const both = person(
      [swap("a", [4], [30, 32]), swap("s1", [4], [32])],
      [swap("x", [3], [31]), swap("w", [1], [31])],
      { 30: 30, 31: 30 },
    );
    const { get, give } = fillMatches(both.matched, both.counts.swapPair);
    expect(slugs(get)).toEqual(["a"]);
    expect(get[0]!.partnerListIds).toEqual([30]);
    expect(slugs(give)).toEqual(["x"]);
  });

  test("another post of a Can swap person: its own matches, bigger side", () => {
    const { get, give } = fillMatches(rin.matched, rin.counts.swapPair, post([32], []));
    expect(slugs(get)).toEqual(["s1", "s2"]);
    expect(give).toEqual([]);
  });

  test("a WTB post: You give only", () => {
    // jun.k: "extras" (have 50, want 51) swaps 1 with P2; "hunting" (want 40) wants 2 of the sender's
    const junK = person(
      [swap("p", [4], [50])],
      [swap("q", [3], [51]), swap("h1", [1], [40]), swap("h2", [1], [40])],
      { 50: 50, 51: 50 },
    );
    expect(junK.counts.swap).toBe(1);
    const { get, give } = fillMatches(junK.matched, junK.counts.swapPair, post([], [40]));
    expect(get).toEqual([]);
    expect(slugs(give)).toEqual(["h1", "h2"]);
  });
});

describe("itemsOnLists", () => {
  const entry = (listId: number, objektId: string | null, hideSerial = false): PartnerEntry => ({
    listId,
    listSlug: `l${listId}`,
    collectionSlug: "302z",
    objektId,
    hideSerial,
  });
  const lists = (...ids: number[]) => new Set(ids);

  test("an any copy from a list that hides serials lands on its entry naming one", () => {
    const items = [item("302z", null, { listSlug: "l1" })];
    expect(itemsOnLists(items, [entry(1, "302z-7", true)], "302z", lists(1))).toEqual([
      { ...items[0]!, listSlug: "l1" },
    ]);
  });

  test("a copy read from another list lands on the match's list offering it", () => {
    const items = [item("302z", 7, { listSlug: "sell" })];
    expect(itemsOnLists(items, [entry(2, "302z-7")], "302z", lists(2))[0]?.listSlug).toBe("l2");
  });

  test("a whole entry takes any copy and every serial", () => {
    const items = [item("302z", null), item("302z", 7)];
    expect(itemsOnLists(items, [entry(2, null)], "302z", lists(2))).toHaveLength(2);
  });

  test("a specific copy never lands on a list that hides serials", () => {
    const items = [item("302z", 7)];
    expect(itemsOnLists(items, [entry(1, null, true)], "302z", lists(1))).toEqual([]);
  });

  test("entries outside the lists or the slug are passed over", () => {
    const items = [item("302z", 7), item("204z", 7)];
    expect(itemsOnLists(items, [entry(1, null)], "302z", lists(2))).toEqual([]);
  });
});

describe("nearGroups", () => {
  const none = new Set<string>();
  const index = new Map([
    ["a", [7]],
    ["b", [8]],
  ]);

  test("a want list's near matches go under You give, any other's under You get", () => {
    const groups = nearGroups(
      [
        { listId: 1, role: "want", verb: "sell", slugs: ["a"], index },
        { listId: 2, role: "sale", verb: "buy", slugs: ["b"], index },
      ],
      { give: none, get: none },
    );
    expect(groups.map((group) => [group.side, group.verb, group.matches[0]?.myListIds])).toEqual([
      ["give", "sell", [7]],
      ["get", "buy", [8]],
    ]);
  });

  test("a collection already added as a match on that side is left out", () => {
    const groups = nearGroups(
      [{ listId: 1, role: "want", verb: "sell", slugs: ["a", "b"], index }],
      {
        give: new Set(["a"]),
        get: none,
      },
    );
    expect(groups[0]?.matches.map((match) => match.slug)).toEqual(["b"]);
  });

  test("near on two of their lists is one entry carrying both", () => {
    const groups = nearGroups(
      [
        { listId: 1, role: "have", verb: "swap", slugs: ["a"], index },
        { listId: 2, role: "have", verb: "swap", slugs: ["a"], index },
      ],
      { give: none, get: none },
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.matches).toEqual([
      { slug: "a", myListIds: [7], partnerListIds: [1, 2], trade: true },
    ]);
  });

  test("nothing left, no group", () => {
    expect(
      nearGroups([{ listId: 1, role: "want", verb: "sell", slugs: ["a"], index }], {
        give: new Set(["a"]),
        get: none,
      }),
    ).toEqual([]);
  });
});
