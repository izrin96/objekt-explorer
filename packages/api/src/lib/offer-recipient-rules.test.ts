import { describe, expect, test } from "bun:test";

import {
  NOTHING_ASKED,
  anyAsksFit,
  askCandidates,
  askPostsMark,
  closedCollectionAsks,
  notWanted,
  onePostVerdict,
  rowPost,
  unwantedGives,
} from "./offer-recipient-rules";

const give = (collectionSlug: string, objektId: string) => ({ collectionSlug, objektId });
const hunting = new Set(["seoyeon-204z", "artms-double-1"]);

describe("unwantedGives", () => {
  test("refuses a give on none of the want lists", () => {
    const gives = [give("hyerin-301z", "1203"), give("seoyeon-204z", "88")];
    expect(unwantedGives(gives, hunting, NOTHING_ASKED)).toEqual([gives[0]!]);
  });

  test("a collection a rule wants counts as wanted", () => {
    expect(unwantedGives([give("artms-double-1", "5")], hunting, NOTHING_ASKED)).toEqual([]);
  });

  test("the rule off filters nothing", () => {
    expect(unwantedGives([give("hyerin-301z", "1203")], null, NOTHING_ASKED)).toEqual([]);
  });

  test("a want list on Trade holding none of the gives refuses them all", () => {
    const gives = [give("hyerin-301z", "1203")];
    expect(unwantedGives(gives, new Set(), NOTHING_ASKED)).toEqual(gives);
  });

  test("a cash buy has nothing to refuse", () => {
    expect(unwantedGives([], hunting, NOTHING_ASKED)).toEqual([]);
  });

  test("a counter may still give the objekt the recipient asked for", () => {
    const asked = { objektIds: new Set(["88"]), anyCopySlugs: new Set<string>() };
    expect(unwantedGives([give("jiwoo-108z", "88")], hunting, asked)).toEqual([]);
  });

  test("a counter may give any copy of a collection the recipient asked for", () => {
    const asked = { objektIds: new Set<string>(), anyCopySlugs: new Set(["jiwoo-108z"]) };
    expect(unwantedGives([give("jiwoo-108z", "91")], hunting, asked)).toEqual([]);
  });
});

const DOUBLES = 1;
const SPARES = 2;
const ask = (
  name: string,
  candidates: number[],
  extra: { kept?: boolean; preferred?: number } = {},
) => ({
  item: name,
  kept: extra.kept ?? false,
  candidates,
  preferred: extra.preferred,
});

describe("onePostVerdict", () => {
  test("asks from the post the offer started on", () => {
    expect(onePostVerdict([ask("a", [DOUBLES]), ask("b", [DOUBLES])], DOUBLES)).toEqual({
      ok: true,
      listId: DOUBLES,
    });
  });

  test("an ask from another post is refused", () => {
    expect(onePostVerdict([ask("a", [DOUBLES]), ask("537", [SPARES])], DOUBLES)).toEqual({
      ok: false,
      listId: DOUBLES,
      refused: ["537"],
    });
  });

  test("starting on a post and asking only another refuses them all", () => {
    expect(onePostVerdict([ask("d", [SPARES]), ask("e", [SPARES])], DOUBLES)).toEqual({
      ok: false,
      listId: DOUBLES,
      refused: ["d", "e"],
    });
  });

  test("from chat, asks all on one post pass", () => {
    expect(onePostVerdict([ask("d", [SPARES]), ask("e", [SPARES])], null)).toEqual({
      ok: true,
      listId: SPARES,
    });
  });

  test("from chat, asks across two posts are refused past the first", () => {
    expect(onePostVerdict([ask("a", [DOUBLES]), ask("d", [SPARES])], null)).toEqual({
      ok: false,
      listId: DOUBLES,
      refused: ["d"],
    });
  });

  test("an objekt on two posts counts through the post", () => {
    expect(onePostVerdict([ask("537", [DOUBLES, SPARES]), ask("a", [DOUBLES])], DOUBLES)).toEqual({
      ok: true,
      listId: DOUBLES,
    });
  });

  test("with no post, a list every ask fits wins over the first's first list", () => {
    expect(onePostVerdict([ask("537", [SPARES, DOUBLES]), ask("a", [DOUBLES])], null)).toEqual({
      ok: true,
      listId: DOUBLES,
    });
  });

  test("with no post, the list the first pick came from wins", () => {
    expect(
      onePostVerdict(
        [ask("537", [DOUBLES, SPARES], { preferred: SPARES }), ask("d", [SPARES])],
        null,
      ),
    ).toEqual({ ok: true, listId: SPARES });
  });

  test("a counter's kept objekt is skipped, listed or not", () => {
    expect(
      onePostVerdict([ask("1203", [SPARES], { kept: true }), ask("a", [DOUBLES])], DOUBLES),
    ).toEqual({ ok: true, listId: DOUBLES });
  });

  test("only kept objekts need no list", () => {
    expect(onePostVerdict([ask("1203", [], { kept: true })], null)).toEqual({
      ok: true,
      listId: null,
    });
  });
});

describe("closedCollectionAsks", () => {
  const asks = [
    { item: "537", kept: false },
    { item: "1203", kept: true },
  ];

  test("by default, asks from a collection with no lists are refused", () => {
    expect(closedCollectionAsks(asks, { hasLists: false, allowCollectionAsks: false })).toEqual([
      "537",
    ]);
  });

  test("allowed, nothing is refused", () => {
    expect(closedCollectionAsks(asks, { hasLists: false, allowCollectionAsks: true })).toEqual([]);
  });

  test("someone with lists is checked against them instead", () => {
    expect(closedCollectionAsks(asks, { hasLists: true, allowCollectionAsks: false })).toEqual([]);
  });

  test("a gives-only offer to someone with no lists passes", () => {
    expect(closedCollectionAsks([], { hasLists: false, allowCollectionAsks: false })).toEqual([]);
  });
});

describe("notWanted", () => {
  const base = { viewerIsRecipient: true, side: "give" as const, wanted: false, asked: false };

  test("an unwanted give reads Not on your wants", () => {
    expect(notWanted(base)).toBe(true);
  });

  test("a give the recipient asked for in the countered offer has no label", () => {
    expect(notWanted({ ...base, asked: true })).toBe(false);
  });

  test("a wanted give has no label", () => {
    expect(notWanted({ ...base, wanted: true })).toBe(false);
  });

  test("the sender sees no label", () => {
    expect(notWanted({ ...base, viewerIsRecipient: false })).toBe(false);
  });
});

describe("askPostsMark", () => {
  const base = { viewerIsRecipient: true, posts: ["doubles", "spares"], suggestable: true };

  test("two posts with the switch on: the mark and the notice", () => {
    expect(askPostsMark(base)).toEqual({ askPosts: ["doubles", "spares"], suggestOnePost: true });
  });

  test("two posts with the gate off: the mark alone", () => {
    expect(askPostsMark({ ...base, suggestable: false })).toEqual({
      askPosts: ["doubles", "spares"],
    });
  });

  test("one post left has neither", () => {
    expect(askPostsMark({ ...base, posts: ["doubles"] })).toEqual({});
  });

  test("the sender sees neither", () => {
    expect(askPostsMark({ ...base, viewerIsRecipient: false })).toEqual({});
  });
});

describe("rowPost", () => {
  test("the post with the most matches", () => {
    expect(
      rowPost(
        new Map([
          [DOUBLES, 3],
          [SPARES, 2],
        ]),
        [SPARES, DOUBLES],
        SPARES,
      ),
    ).toBe(DOUBLES);
  });

  test("a tie goes to the row's lead post", () => {
    expect(
      rowPost(
        new Map([
          [DOUBLES, 2],
          [SPARES, 2],
        ]),
        [SPARES, DOUBLES],
        DOUBLES,
      ),
    ).toBe(DOUBLES);
  });

  test("a tie without the lead goes to list order", () => {
    expect(
      rowPost(
        new Map([
          [DOUBLES, 2],
          [SPARES, 2],
        ]),
        [SPARES, DOUBLES],
        null,
      ),
    ).toBe(SPARES);
  });

  test("no matches, no post", () => {
    expect(rowPost(new Map(), [DOUBLES, SPARES], DOUBLES)).toBe(null);
  });
});

describe("askCandidates", () => {
  test("an any-copy ask stays on the list it was picked from", () => {
    expect(askCandidates({}, [SPARES, DOUBLES], DOUBLES)).toEqual([DOUBLES]);
  });

  test("an any-copy ask with no list, or a list that does not fit, keeps every list", () => {
    expect(askCandidates({}, [SPARES, DOUBLES], undefined)).toEqual([SPARES, DOUBLES]);
    expect(askCandidates({}, [SPARES], DOUBLES)).toEqual([SPARES]);
  });

  test("a serial ask keeps every list that names it", () => {
    expect(askCandidates({ objektId: "537" }, [SPARES, DOUBLES], DOUBLES)).toEqual([
      SPARES,
      DOUBLES,
    ]);
  });

  test("a shown serial beside any copies picked from another list is across posts", () => {
    const asks = [
      { item: "200", kept: false, candidates: [SPARES], preferred: SPARES },
      {
        item: "any",
        kept: false,
        candidates: askCandidates({}, [SPARES, DOUBLES], DOUBLES),
        preferred: DOUBLES,
      },
    ];
    expect(onePostVerdict(asks, null)).toEqual({ ok: false, listId: SPARES, refused: ["any"] });
  });
});

describe("anyAsksFit", () => {
  const any = { collectionSlug: "a" };
  const named = (id: string) => ({ collectionSlug: "a", objektId: id });

  test("as many any asks as the list names copies fit", () => {
    expect(anyAsksFit([any, any], [named("1"), named("2")])).toBe(true);
  });

  test("more any asks than the list names do not fit", () => {
    expect(anyAsksFit([any, any, any], [named("1"), named("2")])).toBe(false);
  });

  test("a copy asked for by serial is not left for an any ask", () => {
    expect(anyAsksFit([named("1"), any, any], [named("1"), named("2")])).toBe(false);
    expect(anyAsksFit([named("1"), any], [named("1"), named("2")])).toBe(true);
  });

  test("a whole-collection entry covers any number", () => {
    expect(anyAsksFit([any, any, any], [{ collectionSlug: "a", objektId: null }])).toBe(true);
  });

  test("an offer with no any ask fits", () => {
    expect(anyAsksFit([named("9")], [])).toBe(true);
  });

  test("a collection the list does not hold does not fit", () => {
    expect(anyAsksFit([any], [{ collectionSlug: "b", objektId: "1" }])).toBe(false);
  });
});
