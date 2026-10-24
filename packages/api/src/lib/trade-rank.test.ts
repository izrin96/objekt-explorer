import { describe, expect, test } from "bun:test";

import {
  type Candidate,
  copyKey,
  countDropped,
  entryVerdict,
  groupBySlug,
  type Holdings,
  matchSides,
  mutualOrder,
  mutualPeople,
  mutualRankOf,
  type MyHaves,
  type MyList,
  type MyWant,
  oneWayPeople,
  oneWayRankOf,
  PARTNER_LIMIT,
  peopleAfter,
  rankPartners,
  recount,
  toPartnerIdentity,
  toRanked,
} from "./trade-rank";

const NOW = new Date("2026-10-06T00:00:00Z");
const RECENT = "2026-10-05T00:00:00Z";
const IDLE = "2026-08-01T00:00:00Z";

const slugs = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

const matches = (prefix: string, n: number, trade = true) =>
  slugs(prefix, n).map((slug) => ({ slug, trade, myListIds: [], partnerListIds: [] }));

const partner = (userId: string, a: number, b: number, updatedAt = RECENT, trade = true) => ({
  userId,
  updatedAt,
  theyHaveIWant: matches("h", a, trade),
  iHaveTheyWant: matches("w", b, trade),
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

  test("Mutual only drops a partner whose matches are sale lists; the one-way views keep them", () => {
    const sale = partner("S", 3, 2, RECENT, false);
    const swap = partner("T", 1, 1);
    expect(order(rankPartners([sale, swap], "mutual", NOW).map((r) => r.partner))).toEqual(["T"]);
    expect(order(rankPartners([sale], "they_have", NOW).map((r) => r.partner))).toEqual(["S"]);
    expect(order(rankPartners([sale], "they_want", NOW).map((r) => r.partner))).toEqual(["S"]);
  });

  test("swap 1 ⇄ 1 ranks above sale 3 ⇄ 2: a sale is not a swap", () => {
    const ranked = rankPartners(
      [partner("sale", 3, 2, RECENT, false), partner("swap", 1, 1)],
      "all",
      NOW,
    );
    expect(order(ranked.map((r) => r.partner))).toEqual(["swap", "sale"]);
  });

  test("a sale list on top of a swap does not raise the mutual score", () => {
    const both = {
      ...partner("B", 1, 1),
      theyHaveIWant: [...matches("h", 1), ...matches("s", 4, false)],
    };
    const ranked = toRanked(both);
    expect(ranked.counts).toMatchObject({ theyHave: 5, tradeTheyHave: 1 });
    expect(mutualRankOf(ranked).mutual).toBe(1);
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
    const myWants = new Map<string, MyWant[]>();

    // A: 5 ⇄ 5 on the lists, of which 1 they have is still held
    const aHave = fiveWay("a-h");
    aHave.forEach((slug, i) => {
      myWants.set(slug, [{ listId: 10, matchSale: true, matchHave: true }]);
      ownedTokens.set(`a-${i}`, { owner: i === 0 ? "0xa" : "0xelsewhere", transferable: true });
    });
    const aWant = fiveWay("a-w");
    // B: 3 ⇄ 3, all held
    const bHave = slugs("b-h", 3);
    bHave.forEach((slug) => {
      myWants.set(slug, [{ listId: 10, matchSale: true, matchHave: true }]);
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
      theyHave: aHave.map((slug, i) => ({ listId: 1, slug, objektId: `a-${i}`, sale: false })),
      theyWant: aWant.map((slug) => ({ listId: 2, slug, matchSale: true, matchHave: true })),
    };
    const b: Candidate = {
      userId: "B",
      listUpdatedAt: { 3: RECENT, 4: RECENT },
      theyHave: bHave.map((slug) => ({ listId: 3, slug, objektId: null, sale: false })),
      theyWant: bWant.map((slug) => ({ listId: 4, slug, matchSale: true, matchHave: true })),
    };

    const owned = { objekts: ownedTokens, copies };
    const recounted = [
      recount(a, new Set(["0xa"]), owned, myWants, {
        all: myHaves,
        trade: myHaves,
        sale: new Map(),
      }),
      recount(b, new Set(["0xb"]), owned, myWants, {
        all: myHaves,
        trade: myHaves,
        sale: new Map(),
      }),
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
      theyWant: [{ listId: 5, slug: "mine", matchSale: true, matchHave: true }],
    };
    const result = recount(candidate, theirs, holdings, new Map(), {
      all: judged,
      trade: judged,
      sale: new Map(),
    });
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
    sale: new Map([["x", { verdict: "ok" as const, listIds: [2] }]]),
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
    const result = wantedBy([{ listId: 8, slug: "x", matchSale: true, matchHave: true }]);
    expect(result.iHaveTheyWant).toEqual([
      { slug: "x", myListIds: [2], partnerListIds: [8], trade: false },
    ]);
  });

  test("a want list that matches trades only is judged on my have lists alone", () => {
    const result = wantedBy([{ listId: 8, slug: "x", matchSale: false, matchHave: true }]);
    expect(result.iHaveTheyWant).toEqual([]);
    expect(result.dropped).toEqual([
      { slug: "x", direction: "iHaveTheyWant", reason: "not_owned" },
    ]);
  });

  test("my sale list never makes a person mutual, whatever their want list takes", () => {
    const mutualFor = (matchSale: boolean) =>
      rankPartners(
        [
          recount(
            {
              userId: "P",
              listUpdatedAt: { 7: RECENT, 8: RECENT },
              theyHave: [{ listId: 7, slug: "y", objektId: "kept", sale: true }],
              theyWant: [{ listId: 8, slug: "x", matchSale, matchHave: true }],
            },
            new Set(["0xp"]),
            holdings,
            new Map([["y", [{ listId: 3, matchSale: true, matchHave: true }]]]),
            myHaves,
          ),
        ],
        "mutual",
        NOW,
      ).length;
    expect(mutualFor(true)).toBe(0);
    expect(mutualFor(false)).toBe(0);
  });

  test("of two want lists on a collection, only the one my side answers is credited", () => {
    const result = wantedBy([
      { listId: 8, slug: "x", matchSale: false, matchHave: true },
      { listId: 9, slug: "x", matchSale: true, matchHave: true },
    ]);
    expect(result.iHaveTheyWant).toEqual([
      { slug: "x", myListIds: [2], partnerListIds: [9], trade: false },
    ]);
    expect(result.dropped).toEqual([]);
  });

  describe("which lists the chip names", () => {
    const wants = new Map([
      [
        "x",
        [
          { listId: 3, matchSale: false, matchHave: true },
          { listId: 4, matchSale: true, matchHave: true },
        ],
      ],
    ]);
    const theyHave = (sale: boolean) =>
      recount(
        {
          userId: "P",
          listUpdatedAt: { 7: RECENT },
          theyHave: [{ listId: 7, slug: "x", objektId: "kept", sale }],
          theyWant: [],
        },
        new Set(["0xp"]),
        holdings,
        wants,
        { all: new Map(), trade: new Map(), sale: new Map() },
      ).theyHaveIWant.map((match) => match.myListIds);

    test("their have list is answered by every want list of mine holding it", () => {
      expect(theyHave(false)).toEqual([[3, 4]]);
    });

    test("their sale list is answered only by my want lists open to buying", () => {
      expect(theyHave(true)).toEqual([[4]]);
    });

    test("their want list that swaps only is answered by my have lists, not my sale lists", () => {
      const mine = {
        all: new Map([["x", { verdict: "ok" as const, listIds: [1, 2] }]]),
        trade: new Map([["x", { verdict: "ok" as const, listIds: [1] }]]),
        sale: new Map([["x", { verdict: "ok" as const, listIds: [2] }]]),
      };
      const answers = (matchSale: boolean) =>
        recount(
          {
            userId: "P",
            listUpdatedAt: { 8: RECENT },
            theyHave: [],
            theyWant: [{ listId: 8, slug: "x", matchSale, matchHave: true }],
          },
          new Set(["0xp"]),
          holdings,
          new Map(),
          mine,
        ).iHaveTheyWant.map((match) => match.myListIds);
      expect(answers(false)).toEqual([[1]]);
      expect(answers(true)).toEqual([[1, 2]]);
    });
  });

  describe("Buying only", () => {
    const buyingOnly = { matchSale: true, matchHave: false };
    const both = { matchSale: true, matchHave: true };

    const theyHave = (entries: { listId: number; sale: boolean; objektId: string }[]) =>
      recount(
        {
          userId: "P",
          listUpdatedAt: { 6: RECENT, 7: RECENT },
          theyHave: entries.map((entry) => ({ ...entry, slug: "x" })),
          theyWant: [],
        },
        new Set(["0xp"]),
        holdings,
        new Map([["x", [{ listId: 3, ...buyingOnly }]]]),
        { all: new Map(), trade: new Map(), sale: new Map() },
      ).theyHaveIWant;

    test("a Buying only want of mine is not answered by a partner have entry", () => {
      expect(theyHave([{ listId: 6, sale: false, objektId: "kept" }])).toEqual([]);
    });

    test("a Buying only want of mine is answered by a partner sale entry", () => {
      expect(theyHave([{ listId: 7, sale: true, objektId: "kept" }])).toEqual([
        { slug: "x", myListIds: [3], partnerListIds: [7], trade: false },
      ]);
    });

    test("a slug on both a have and a sale entry counts through the sale entry only", () => {
      expect(
        theyHave([
          { listId: 6, sale: false, objektId: "kept" },
          { listId: 7, sale: true, objektId: "kept" },
        ]),
      ).toEqual([{ slug: "x", myListIds: [3], partnerListIds: [7], trade: false }]);
    });

    test("a Buying only want beside a swaps want on a slug is credited per entry kind", () => {
      const result = recount(
        {
          userId: "P",
          listUpdatedAt: { 6: RECENT, 7: RECENT },
          theyHave: [
            { listId: 6, slug: "x", objektId: "sold", sale: false },
            { listId: 7, slug: "x", objektId: "kept", sale: true },
          ],
          theyWant: [],
        },
        new Set(["0xp"]),
        holdings,
        new Map([
          [
            "x",
            [
              { listId: 3, matchSale: false, matchHave: true },
              { listId: 4, ...buyingOnly },
            ],
          ],
        ]),
        { all: new Map(), trade: new Map(), sale: new Map() },
      );
      expect(result.theyHaveIWant).toEqual([
        { slug: "x", myListIds: [4], partnerListIds: [7], trade: false },
      ]);
    });

    test("a slug whose sale entry is no longer owned is dropped when my only want is Buying only", () => {
      const result = recount(
        {
          userId: "P",
          listUpdatedAt: { 6: RECENT, 7: RECENT },
          theyHave: [
            { listId: 6, slug: "x", objektId: "kept", sale: false },
            { listId: 7, slug: "x", objektId: "sold", sale: true },
          ],
          theyWant: [],
        },
        new Set(["0xp"]),
        holdings,
        new Map([["x", [{ listId: 3, ...buyingOnly }]]]),
        { all: new Map(), trade: new Map(), sale: new Map() },
      );
      expect(result.theyHaveIWant).toEqual([]);
      expect(result.dropped).toEqual([
        { slug: "x", direction: "theyHaveIWant", reason: "not_owned" },
      ]);
    });

    describe("a partner's Buying only want", () => {
      const mine = {
        all: new Map([["x", { verdict: "ok" as const, listIds: [1, 2] }]]),
        trade: new Map([["x", { verdict: "ok" as const, listIds: [1] }]]),
        sale: new Map([["x", { verdict: "ok" as const, listIds: [2] }]]),
      };
      const answers = (haves: MyHaves, want: { matchSale: boolean; matchHave: boolean }) =>
        recount(
          {
            userId: "P",
            listUpdatedAt: { 8: RECENT },
            theyHave: [],
            theyWant: [{ listId: 8, slug: "x", ...want }],
          },
          new Set(["0xp"]),
          holdings,
          new Map(),
          haves,
        ).iHaveTheyWant;

      test("is answered only by my sale list", () => {
        expect(answers(mine, buyingOnly)).toEqual([
          { slug: "x", myListIds: [2], partnerListIds: [8], trade: false },
        ]);
        expect(answers(mine, both)).toEqual([
          { slug: "x", myListIds: [1, 2], partnerListIds: [8], trade: true },
        ]);
      });

      test("is not answered by my have list alone", () => {
        expect(answers({ ...mine, sale: new Map() }, buyingOnly)).toEqual([]);
      });
    });
  });

  describe("trade flag", () => {
    const tradeOf = (theyHave: { listId: number; objektId: string; sale: boolean }[]) =>
      recount(
        {
          userId: "P",
          listUpdatedAt: { 1: RECENT, 2: RECENT },
          theyHave: theyHave.map((entry) => ({ ...entry, slug: "x" })),
          theyWant: [],
        },
        new Set(["0xp"]),
        holdings,
        new Map([["x", [{ listId: 9, matchSale: true, matchHave: true }]]]),
        { all: new Map(), trade: new Map(), sale: new Map() },
      ).theyHaveIWant.map((match) => match.trade);

    test("a have-list match is trade, a sale-only match isn't", () => {
      expect(tradeOf([{ listId: 1, objektId: "kept", sale: false }])).toEqual([true]);
      expect(tradeOf([{ listId: 2, objektId: "kept", sale: true }])).toEqual([false]);
    });

    test("a collection on an owned have entry and a sale entry is trade", () => {
      expect(
        tradeOf([
          { listId: 1, objektId: "kept", sale: false },
          { listId: 2, objektId: "kept", sale: true },
        ]),
      ).toEqual([true]);
    });

    test("a have entry no longer owned leaves the sale entry to count alone, not as trade", () => {
      expect(
        tradeOf([
          { listId: 1, objektId: "sold", sale: false },
          { listId: 2, objektId: "kept", sale: true },
        ]),
      ).toEqual([false]);
    });

    test("my have list answering their want is trade, my sale list alone isn't", () => {
      const answer = (trade: boolean) =>
        recount(
          {
            userId: "P",
            listUpdatedAt: { 8: RECENT },
            theyHave: [],
            theyWant: [{ listId: 8, slug: "x", matchSale: true, matchHave: true }],
          },
          new Set(["0xp"]),
          holdings,
          new Map(),
          {
            all: new Map([["x", { verdict: "ok" as const, listIds: [2] }]]),
            trade: trade ? new Map([["x", { verdict: "ok" as const, listIds: [1] }]]) : new Map(),
            sale: new Map([["x", { verdict: "ok" as const, listIds: [2] }]]),
          },
        ).iHaveTheyWant.map((match) => match.trade);
      expect(answer(true)).toEqual([true]);
      expect(answer(false)).toEqual([false]);
    });
  });

  test("idle is judged on the lists still contributing a match", () => {
    const result = recount(
      {
        userId: "P",
        listUpdatedAt: { 1: IDLE, 2: RECENT },
        theyHave: [
          { listId: 1, slug: "a", objektId: "kept", sale: false },
          { listId: 2, slug: "b", objektId: "sold", sale: false },
        ],
        theyWant: [],
      },
      new Set(["0xp"]),
      holdings,
      new Map([
        ["a", [{ listId: 9, matchSale: true, matchHave: true }]],
        ["b", [{ listId: 9, matchSale: true, matchHave: true }]],
      ]),
      { all: new Map(), trade: new Map(), sale: new Map() },
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
  const flags = { isDefault: false };
  const rin = { address: "0xRIN", nickname: "rinrin", ...flags };
  const alt = { address: "0xalt", nickname: "rin2", ...flags };

  test("bound nickname", () => {
    expect(
      toPartnerIdentity("rin.account", [{ profileAddress: "0xrin", matches: 3 }], [rin]),
    ).toEqual({ name: "rinrin", address: "0xrin", nickname: "rinrin", also: [] });
  });

  test("a bound profile with no Cosmo ID is named by its shortened address", () => {
    const address = "0x9ca6eb130d3aa5150e2f2fee61fd140e14cd8b0d";
    for (const nickname of [null, address]) {
      expect(
        toPartnerIdentity(
          "tester",
          [{ profileAddress: address, matches: 2 }],
          [{ address, nickname, ...flags }],
        ),
      ).toEqual({ name: "0x9ca6…8b0d", address, nickname: null, also: [] });
    }
  });

  test("no bound address names the only profile", () => {
    expect(toPartnerIdentity("rin.account", [{ profileAddress: null, matches: 3 }], [rin])).toEqual(
      { name: "rinrin", address: "0xrin", nickname: "rinrin", also: [] },
    );
  });

  test("no bound address names the default profile", () => {
    expect(
      toPartnerIdentity(
        "rin.account",
        [{ profileAddress: null, matches: 3 }],
        [rin, { ...alt, isDefault: true }],
      ),
    ).toEqual({ name: "rin2", address: "0xalt", nickname: "rin2", also: [] });
  });

  test("no bound address and no flag names the first linked profile", () => {
    expect(
      toPartnerIdentity("rin.account", [{ profileAddress: null, matches: 3 }], [alt, rin]),
    ).toEqual({ name: "rin2", address: "0xalt", nickname: "rin2", also: [] });
  });

  test("no profile at all names the account", () => {
    expect(toPartnerIdentity("rin.account", [{ profileAddress: null, matches: 3 }], [])).toEqual({
      name: "rin.account",
      address: null,
      nickname: null,
      also: [],
    });
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
    { id: 1, listType: "have", linkedListId: 3 },
    { id: 2, listType: "have", linkedListId: null },
    { id: 3, listType: "want", linkedListId: 1 },
    { id: 4, listType: "general", linkedListId: null },
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
    const unbound: MyList[] = [{ id: 3, listType: "want", linkedListId: 1 }];
    expect(matchSides(unbound, 3, "all")).toEqual({ listId: 3, haveListIds: [], wantListIds: [3] });
  });

  test("a sale list counts on the have side, and compares one way when named", () => {
    const withSale: MyList[] = [...lists, { id: 5, listType: "sale", linkedListId: null }];
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
        theyHave: [{ listId: 7, slug: "binary", objektId: "t1", sale: false }],
        theyWant: [
          { listId: 8, slug: "on-spares", matchSale: true, matchHave: true },
          { listId: 8, slug: "on-dupes", matchSale: true, matchHave: true },
        ],
      },
      new Set(["0xp"]),
      holdings,
      new Map([["binary", [{ listId: 3, matchSale: true, matchHave: true }]]]),
      { all: myHaves, trade: myHaves, sale: new Map() },
    );

    expect(result.iHaveTheyWant.map((m) => m.slug)).toEqual(["on-spares"]);
    expect(result.theyHaveIWant.map((m) => m.myListIds)).toEqual([[3]]);
    expect(rankPartners([result], "mutual", NOW)).toHaveLength(1);
  });
});

describe("mutualOrder", () => {
  const person = (userId: string, theyHave: number, youHave: number, updatedAt = RECENT) => ({
    userId,
    updatedAt,
    counts: { theyHave, youHave, tradeTheyHave: theyHave, tradeYouHave: youHave },
  });

  test("mutual, then sum, then last change, then id, with no idle tier", () => {
    const ordered = mutualOrder([
      person("z", 2, 2),
      person("idle", 3, 3, IDLE),
      person("a", 2, 2),
      person("sum", 2, 5),
      person("new", 2, 2, "2026-10-05T12:00:00Z"),
    ]);
    expect(order(ordered)).toEqual(["idle", "sum", "new", "a", "z"]);
  });
});

describe("mutualPeople", () => {
  const person = (userId: string, theyHave: number, youHave: number, updatedAt = RECENT) => ({
    userId,
    updatedAt,
    counts: { theyHave, youHave, tradeTheyHave: theyHave, tradeYouHave: youHave },
  });

  test("keeps every mutual person past the 50 cap, in Mutual order", () => {
    const many = Array.from({ length: PARTNER_LIMIT + 10 }, (_, i) => person(`p${i}`, 1, 1));
    const people = mutualPeople([person("top", 3, 3), ...many]);
    expect(people).toHaveLength(PARTNER_LIMIT + 11);
    expect(people[0]!.userId).toBe("top");
  });

  test("an idle person takes no place from an active one", () => {
    const people = mutualPeople([person("active", 1, 1), person("idle", 4, 4, IDLE)]);
    expect(order(people)).toEqual(["idle", "active"]);
  });

  test("a sale-only person both ways is one way, not mutual", () => {
    const sale = toRanked(partner("sale", 3, 2, RECENT, false));
    expect(mutualPeople([sale])).toEqual([]);
    expect(order(oneWayPeople([sale]))).toEqual(["sale"]);
  });

  test("drops anyone who is not mutual", () => {
    expect(order(mutualPeople([person("one-way", 5, 0), person("both", 1, 1)]))).toEqual(["both"]);
  });
});

describe("peopleAfter", () => {
  const person = (userId: string, mutual: number, updatedAt = RECENT) => ({
    userId,
    updatedAt,
    counts: { theyHave: mutual, youHave: mutual, tradeTheyHave: mutual, tradeYouHave: mutual },
  });
  const ordered = mutualOrder([person("A", 5), person("B", 4), person("C", 3), person("D", 2)]);

  test("starts at the cursor's person and keeps everyone after", () => {
    const rank = mutualRankOf(person("B", 4));
    expect(order(peopleAfter(ordered, rank))).toEqual(["B", "C", "D"]);
  });

  test("a person who moved up is only the cursor's person", () => {
    const rank = mutualRankOf(person("C", 3));
    const moved = mutualOrder([person("A", 5), person("C", 6), person("B", 4), person("D", 2)]);
    expect(order(peopleAfter(moved, rank))).toEqual(["C", "D"]);
    expect(order(peopleAfter(moved, mutualRankOf(person("B", 4))))).toEqual(["B", "D"]);
  });

  test("a cursor person who left the ranking continues with those after the tuple", () => {
    const rank = mutualRankOf(person("X", 3, "2026-10-04T00:00:00Z"));
    expect(order(peopleAfter(ordered, rank))).toEqual(["D"]);
  });
});

describe("oneWayPeople", () => {
  const person = (userId: string, theyHave: number, youHave: number, updatedAt = RECENT) => ({
    userId,
    updatedAt,
    counts: { theyHave, youHave, tradeTheyHave: theyHave, tradeYouHave: youHave },
  });

  test("most matches first, whichever way they run", () => {
    const people = oneWayPeople([person("one", 1, 0), person("seven", 7, 0), person("both", 2, 3)]);
    expect(order(people)).toEqual(["seven", "both", "one"]);
  });

  test("a mutual person ranks by the sum, not the mutual score", () => {
    expect(order(oneWayPeople([person("mutual", 2, 2), person("lots", 6, 0)]))).toEqual([
      "lots",
      "mutual",
    ]);
  });

  test("ties fall to the most recent change, then the id", () => {
    const people = oneWayPeople([
      person("b", 2, 0),
      person("old", 2, 0, "2026-09-20T00:00:00Z"),
      person("a", 2, 0),
    ]);
    expect(order(people)).toEqual(["a", "b", "old"]);
  });

  test("drops anyone with no match, and keeps an idle person in place", () => {
    const people = oneWayPeople([person("none", 0, 0), person("idle", 3, 0, IDLE)]);
    expect(order(people)).toEqual(["idle"]);
  });

  test("keeps everyone past the 50 cap", () => {
    const many = Array.from({ length: PARTNER_LIMIT + 10 }, (_, i) => person(`p${i}`, 1, 0));
    expect(oneWayPeople(many)).toHaveLength(PARTNER_LIMIT + 10);
  });
});

describe("peopleAfter", () => {
  const person = (userId: string, sum: number, updatedAt = RECENT) => ({
    userId,
    updatedAt,
    counts: { theyHave: sum, youHave: 0, tradeTheyHave: sum, tradeYouHave: 0 },
  });
  const ordered = oneWayPeople([person("A", 5), person("B", 4), person("C", 3), person("D", 2)]);

  test("starts at the cursor's person and keeps everyone after", () => {
    expect(order(peopleAfter(ordered, oneWayRankOf(person("B", 4))))).toEqual(["B", "C", "D"]);
  });

  test("a person who moved up is only the cursor's person", () => {
    const moved = oneWayPeople([person("A", 5), person("C", 8), person("B", 4), person("D", 2)]);
    expect(order(peopleAfter(moved, oneWayRankOf(person("C", 3))))).toEqual(["C", "D"]);
    expect(order(peopleAfter(moved, oneWayRankOf(person("B", 4))))).toEqual(["B", "D"]);
  });

  test("a cursor person who left the ranking continues with those after the tuple", () => {
    const rank = oneWayRankOf(person("X", 3, "2026-10-04T00:00:00Z"));
    expect(order(peopleAfter(ordered, rank))).toEqual(["D"]);
  });

  test("a person with the cursor's tuple but another id sorts by id", () => {
    const tied = oneWayPeople([person("a", 2), person("b", 2), person("c", 2)]);
    expect(order(peopleAfter(tied, oneWayRankOf(person("b", 2))))).toEqual(["b", "c"]);
  });
});
