import { describe, expect, test } from "bun:test";

import {
  type Candidate,
  copyKey,
  countDropped,
  entryVerdict,
  groupBySlug,
  type Holdings,
  matchSides,
  type MyList,
  PARTNER_LIMIT,
  rankPartners,
  recount,
  toPartnerIdentity,
} from "./trade-rank";

const NOW = new Date("2026-10-06T00:00:00Z");
const RECENT = "2026-10-05T00:00:00Z";
const IDLE = "2026-08-01T00:00:00Z";

const slugs = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

const partner = (userId: string, a: number, b: number, updatedAt = RECENT) => ({
  userId,
  updatedAt,
  theyHaveIWant: slugs("h", a),
  iHaveTheyWant: slugs("w", b),
});

const order = (partners: { userId: string }[]) => partners.map((p) => p.userId);

describe("rankPartners", () => {
  test("mutual beats one-sided", () => {
    const ranked = rankPartners([partner("A", 9, 0), partner("B", 2, 2)], "all", NOW);
    expect(order(ranked.map((r) => r.partner))).toEqual(["B", "A"]);
  });

  test("ties fall to the sum, then the most recent change", () => {
    const ranked = rankPartners(
      [
        partner("old", 2, 3, "2026-09-20T00:00:00Z"),
        partner("small", 2, 2),
        partner("new", 2, 3, "2026-10-04T00:00:00Z"),
      ],
      "all",
      NOW,
    );
    expect(order(ranked.map((r) => r.partner))).toEqual(["new", "old", "small"]);
  });

  test("an idle high scorer ranks after every active partner", () => {
    const ranked = rankPartners([partner("idle", 3, 3, IDLE), partner("active", 1, 1)], "all", NOW);
    expect(ranked.map((r) => [r.partner.userId, r.idle])).toEqual([
      ["active", false],
      ["idle", true],
    ]);
  });

  test("Mutual only keeps partners with both counts above zero", () => {
    const partners = [partner("A", 9, 0), partner("B", 2, 2), partner("C", 0, 4)];
    expect(order(rankPartners(partners, "mutual", NOW).map((r) => r.partner))).toEqual(["B"]);
    expect(order(rankPartners(partners, "they_have", NOW).map((r) => r.partner))).toEqual([
      "B",
      "A",
    ]);
    expect(order(rankPartners(partners, "they_want", NOW).map((r) => r.partner))).toEqual([
      "B",
      "C",
    ]);
  });

  test("cuts to the partner limit", () => {
    const many = Array.from({ length: PARTNER_LIMIT + 5 }, (_, i) => partner(`p${i}`, 1, 1));
    expect(rankPartners(many, "all", NOW)).toHaveLength(PARTNER_LIMIT);
  });
});

describe("ownership", () => {
  const theirs = new Set(["0xpartner"]);

  const holdings: Holdings = {
    objekts: new Map([
      ["t-owned", { owner: "0xpartner", transferable: true }],
      ["t-sold", { owner: "0xsomeoneelse", transferable: true }],
      ["t-locked", { owner: "0xpartner", transferable: false }],
    ]),
    copies: new Map([
      [copyKey("0xpartner", "held"), true],
      [copyKey("0xpartner", "held-locked"), false],
      [copyKey("0xme", "mine"), true],
    ]),
  };

  test("an objekt entry counts only while a linked address holds it, transferable", () => {
    const entry = (objektId: string) => ({ listId: 1, slug: "s", objektId });
    expect(entryVerdict(entry("t-owned"), theirs, holdings)).toBe("ok");
    expect(entryVerdict(entry("t-sold"), theirs, holdings)).toBe("not_owned");
    expect(entryVerdict(entry("t-gone"), theirs, holdings)).toBe("not_owned");
    expect(entryVerdict(entry("t-locked"), theirs, holdings)).toBe("not_transferable");
  });

  test("a collection entry counts while any transferable copy is held", () => {
    const entry = (slug: string) => ({ listId: 1, slug, objektId: null });
    expect(entryVerdict(entry("held"), theirs, holdings)).toBe("ok");
    expect(entryVerdict(entry("held-locked"), theirs, holdings)).toBe("not_transferable");
    expect(entryVerdict(entry("nothing"), theirs, holdings)).toBe("not_owned");
  });

  test("ranked on what is still owned", () => {
    const fiveWay = (prefix: string) => slugs(prefix, 5);
    const ownedTokens = new Map<string, { owner: string; transferable: boolean }>();
    const copies = new Map<string, boolean>();
    const myHaves = new Map<string, { verdict: "ok"; listIds: number[] }>();
    const myWants = new Map<string, number[]>();

    // A: 5 ⇄ 5 on the lists, of which 1 they have is still held
    const aHave = fiveWay("a-h");
    aHave.forEach((slug, i) => {
      myWants.set(slug, [10]);
      ownedTokens.set(`a-${i}`, { owner: i === 0 ? "0xa" : "0xelsewhere", transferable: true });
    });
    const aWant = fiveWay("a-w");
    // B: 3 ⇄ 3, all held
    const bHave = slugs("b-h", 3);
    bHave.forEach((slug) => {
      myWants.set(slug, [10]);
      copies.set(copyKey("0xb", slug), true);
    });
    const bWant = slugs("b-w", 3);
    for (const slug of [...aWant, ...bWant]) {
      copies.set(copyKey("0xme", slug), true);
      myHaves.set(slug, { verdict: "ok", listIds: [20] });
    }

    const a: Candidate = {
      userId: "A",
      listUpdatedAt: { 1: RECENT, 2: RECENT },
      theyHave: aHave.map((slug, i) => ({ listId: 1, slug, objektId: `a-${i}` })),
      theyWant: aWant.map((slug) => ({ listId: 2, slug, takesSales: true })),
    };
    const b: Candidate = {
      userId: "B",
      listUpdatedAt: { 3: RECENT, 4: RECENT },
      theyHave: bHave.map((slug) => ({ listId: 3, slug, objektId: null })),
      theyWant: bWant.map((slug) => ({ listId: 4, slug, takesSales: true })),
    };

    const owned = { objekts: ownedTokens, copies };
    const recounted = [
      recount(a, new Set(["0xa"]), owned, myWants, { all: myHaves, trade: myHaves }),
      recount(b, new Set(["0xb"]), owned, myWants, { all: myHaves, trade: myHaves }),
    ];
    const ranked = rankPartners(recounted, "all", NOW);

    expect(order(ranked.map((r) => r.partner))).toEqual(["B", "A"]);
    const rowA = ranked[1]!.partner;
    expect(Math.min(rowA.theyHaveIWant.length, rowA.iHaveTheyWant.length)).toBe(1);
    expect(countDropped(recounted)).toEqual({ notOwned: 4, notTransferable: 0 });
  });

  test("my own sold have entry drops the match it made", () => {
    const judged = new Map([["mine", { verdict: "not_owned" as const, listIds: [] }]]);
    const candidate: Candidate = {
      userId: "P",
      listUpdatedAt: { 5: RECENT },
      theyHave: [],
      theyWant: [{ listId: 5, slug: "mine", takesSales: true }],
    };
    const result = recount(candidate, theirs, holdings, new Map(), { all: judged, trade: judged });
    expect(result.iHaveTheyWant).toEqual([]);
    expect(result.dropped).toEqual([
      { slug: "mine", direction: "iHaveTheyWant", reason: "not_owned" },
    ]);
  });
});

describe("recount details", () => {
  const holdings: Holdings = {
    objekts: new Map([
      ["kept", { owner: "0xp", transferable: true }],
      ["sold", { owner: "0xelse", transferable: true }],
    ]),
    copies: new Map(),
  };

  // "x" is owned only through my sale list 2; my have list 1 no longer owns it
  const myHaves = {
    all: new Map([["x", { verdict: "ok" as const, listIds: [2] }]]),
    trade: new Map([["x", { verdict: "not_owned" as const, listIds: [] }]]),
  };
  const wantedBy = (theyWant: Candidate["theyWant"]) =>
    recount(
      { userId: "P", listUpdatedAt: { 8: RECENT, 9: RECENT }, theyHave: [], theyWant },
      new Set(["0xp"]),
      holdings,
      new Map(),
      myHaves,
    );

  test("my sale list answers a want list that takes sales", () => {
    const result = wantedBy([{ listId: 8, slug: "x", takesSales: true }]);
    expect(result.iHaveTheyWant).toEqual([{ slug: "x", myListIds: [2], partnerListIds: [8] }]);
  });

  test("a want list that matches trades only is judged on my have lists alone", () => {
    const result = wantedBy([{ listId: 8, slug: "x", takesSales: false }]);
    expect(result.iHaveTheyWant).toEqual([]);
    expect(result.dropped).toEqual([
      { slug: "x", direction: "iHaveTheyWant", reason: "not_owned" },
    ]);
  });

  test("of two want lists on a collection, only the one my side answers is credited", () => {
    const result = wantedBy([
      { listId: 8, slug: "x", takesSales: false },
      { listId: 9, slug: "x", takesSales: true },
    ]);
    expect(result.iHaveTheyWant).toEqual([{ slug: "x", myListIds: [2], partnerListIds: [9] }]);
    expect(result.dropped).toEqual([]);
  });

  test("idle is judged on the lists still contributing a match", () => {
    const result = recount(
      {
        userId: "P",
        listUpdatedAt: { 1: IDLE, 2: RECENT },
        theyHave: [
          { listId: 1, slug: "a", objektId: "kept" },
          { listId: 2, slug: "b", objektId: "sold" },
        ],
        theyWant: [],
      },
      new Set(["0xp"]),
      holdings,
      new Map([
        ["a", [9]],
        ["b", [9]],
      ]),
      { all: new Map(), trade: new Map() },
    );
    expect(result.updatedAt).toBe(IDLE);
    expect(rankPartners([result], "all", NOW)[0]!.idle).toBe(true);
  });

  test("my own dropped have counts once, a partner's once per partner", () => {
    const mine = { slug: "x", direction: "iHaveTheyWant", reason: "not_owned" } as const;
    const theirs = { slug: "y", direction: "theyHaveIWant", reason: "not_transferable" } as const;
    expect(
      countDropped([
        { userId: "A", dropped: [mine, theirs] },
        { userId: "B", dropped: [mine, theirs] },
      ]),
    ).toEqual({ notOwned: 1, notTransferable: 2 });
  });
});

describe("toPartnerIdentity", () => {
  const rin = { address: "0xRIN", nickname: "rinrin" };
  const alt = { address: "0xalt", nickname: "rin2" };

  test("bound nickname", () => {
    expect(
      toPartnerIdentity("rin.account", [{ profileAddress: "0xrin", matches: 3 }], [rin]),
    ).toEqual({ name: "rinrin", address: "0xrin", nickname: "rinrin", also: [] });
  });

  test("Hide Cosmo ID does not apply to Trade", () => {
    const hidden = { ...rin, hideNickname: true };
    expect(
      toPartnerIdentity("rin.account", [{ profileAddress: "0xrin", matches: 3 }], [hidden]),
    ).toEqual({ name: "rinrin", address: "0xrin", nickname: "rinrin", also: [] });
  });

  test("a bound profile with no Cosmo ID is named by its shortened address", () => {
    const address = "0x9ca6eb130d3aa5150e2f2fee61fd140e14cd8b0d";
    for (const nickname of [null, address]) {
      expect(
        toPartnerIdentity(
          "tester",
          [{ profileAddress: address, matches: 2 }],
          [{ address, nickname }],
        ),
      ).toEqual({ name: "0x9ca6…8b0d", address, nickname: null, also: [] });
    }
  });

  test("no bound address", () => {
    expect(toPartnerIdentity("rin.account", [{ profileAddress: null, matches: 3 }], [rin])).toEqual(
      { name: "rin.account", address: null, nickname: null, also: [] },
    );
  });

  test("two bound addresses name the best match and list the other", () => {
    expect(
      toPartnerIdentity(
        "rin.account",
        [
          { profileAddress: "0xalt", matches: 1 },
          { profileAddress: "0xrin", matches: 3 },
          { profileAddress: null, matches: 2 },
        ],
        [rin, alt],
      ),
    ).toEqual({
      name: "rinrin",
      address: "0xrin",
      nickname: "rinrin",
      also: [{ address: "0xalt", nickname: "rin2" }],
    });
  });
});

describe("matchSides", () => {
  // Spares (1) and Binary hunt (3) are linked; Dupes (2) is not
  const lists: MyList[] = [
    { id: 1, listTypeNew: "have", linkedListId: 3 },
    { id: 2, listTypeNew: "have", linkedListId: null },
    { id: 3, listTypeNew: "want", linkedListId: 1 },
    { id: 4, listTypeNew: "general", linkedListId: null },
  ];

  test("no list uses every have and want list", () => {
    expect(matchSides(lists, null, "all")).toEqual({
      listId: null,
      haveListIds: [1, 2],
      wantListIds: [3],
    });
  });

  test("a foreign or non-trade list is ignored", () => {
    expect(matchSides(lists, 99, "all").listId).toBeNull();
    expect(matchSides(lists, 4, "all")).toEqual({
      listId: null,
      haveListIds: [1, 2],
      wantListIds: [3],
    });
  });

  test("a named list compares with the list it links to, from either end", () => {
    expect(matchSides(lists, 1, "all")).toEqual({ listId: 1, haveListIds: [1], wantListIds: [3] });
    expect(matchSides(lists, 3, "all")).toEqual({ listId: 3, haveListIds: [1], wantListIds: [3] });
  });

  test("a named list with no link compares one way", () => {
    expect(matchSides(lists, 2, "all")).toEqual({ listId: 2, haveListIds: [2], wantListIds: [] });
  });

  test("a link to a list not on Trade counts as none", () => {
    const unbound: MyList[] = [{ id: 3, listTypeNew: "want", linkedListId: 1 }];
    expect(matchSides(unbound, 3, "all")).toEqual({ listId: 3, haveListIds: [], wantListIds: [3] });
  });

  test("a sale list counts on the have side, and compares one way when named", () => {
    const withSale: MyList[] = [...lists, { id: 5, listTypeNew: "sale", linkedListId: null }];
    expect(matchSides(withSale, null, "all").haveListIds).toEqual([1, 2, 5]);
    expect(matchSides(withSale, 5, "all")).toEqual({
      listId: 5,
      haveListIds: [5],
      wantListIds: [],
    });
  });

  test("a one-way view compares only its own direction", () => {
    expect(matchSides(lists, null, "they_want")).toEqual({
      listId: null,
      haveListIds: [1, 2],
      wantListIds: [],
    });
    expect(matchSides(lists, 1, "they_have")).toEqual({
      listId: 1,
      haveListIds: [],
      wantListIds: [3],
    });
  });

  test("a linked have list, mutual", () => {
    // Spares (1) answers "they want what I have"; its Binary hunt (3) answers "they have what I want"
    const sides = matchSides(lists, 1, "mutual");
    expect(sides).toEqual({ listId: 1, haveListIds: [1], wantListIds: [3] });

    const myHaveEntries = [
      { listId: 1, slug: "on-spares", objektId: null },
      { listId: 2, slug: "on-dupes", objektId: null },
    ].filter((entry) => sides.haveListIds.includes(entry.listId));
    const holdings: Holdings = {
      objekts: new Map([["t1", { owner: "0xp", transferable: true }]]),
      copies: new Map([
        [copyKey("0xme", "on-spares"), true],
        [copyKey("0xme", "on-dupes"), true],
      ]),
    };
    const myHaves = new Map(
      [...groupBySlug(myHaveEntries)].map(([slug, entries]) => [
        slug,
        { verdict: entryVerdict(entries[0]!, new Set(["0xme"]), holdings), listIds: [1] },
      ]),
    );

    const result = recount(
      {
        userId: "P",
        listUpdatedAt: { 7: RECENT, 8: RECENT },
        theyHave: [{ listId: 7, slug: "binary", objektId: "t1" }],
        theyWant: [
          { listId: 8, slug: "on-spares", takesSales: true },
          { listId: 8, slug: "on-dupes", takesSales: true },
        ],
      },
      new Set(["0xp"]),
      holdings,
      new Map([["binary", [3]]]),
      { all: myHaves, trade: myHaves },
    );

    expect(result.iHaveTheyWant.map((m) => m.slug)).toEqual(["on-spares"]);
    expect(result.theyHaveIWant.map((m) => m.myListIds)).toEqual([[3]]);
    expect(rankPartners([result], "mutual", NOW)).toHaveLength(1);
  });
});
