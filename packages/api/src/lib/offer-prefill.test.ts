import { describe, expect, test } from "bun:test";

import type { CandidateItem } from "../schemas/offer";
import {
  chooseMatchPicks,
  itemsOnLists,
  matchesThrough,
  nearGroups,
  type PartnerEntry,
  postSides,
} from "./offer-prefill";

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
