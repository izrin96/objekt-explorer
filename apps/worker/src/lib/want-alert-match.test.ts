import { describe, expect, test } from "bun:test";

import { copyKey, type Holdings } from "@repo/api/lib/trade-rank";

import {
  type AlertInput,
  type AlertList,
  type AlertPair,
  listProgress,
  mutualKey,
  mutualQuestions,
  prefKey,
  selectAlerts,
  wholeEntries,
} from "./want-alert-match";

const SELLER = "seller";
const WANTER = "wanter";
const SELLER_ADDR = "0xseller";
const WANTER_ADDR = "0xwanter";
const SLUG = "seoyeon-204z";

const list = (id: number, userId: string, extra: Partial<AlertList> = {}): AlertList => ({
  id,
  userId,
  slug: `list${id}`,
  name: `List ${id}`,
  ownerName: `${userId}-name`,
  sale: false,
  swapPair: true,
  wantsSwaps: true,
  ...extra,
});

const SALE = list(1, SELLER);
const WANT = list(2, WANTER);

const forward = (extra: Partial<AlertPair> = {}): AlertPair => ({
  direction: "forward",
  offerListId: SALE.id,
  wantListId: WANT.id,
  slug: SLUG,
  objektId: null,
  ...extra,
});

const holdings = (
  copies: [string, string, boolean][] = [[SELLER_ADDR, SLUG, true]],
  objekts: [string, string, boolean][] = [],
): Holdings => ({
  copies: new Map(
    copies.map(([owner, slug, transferable]) => [copyKey(owner, slug), transferable]),
  ),
  objekts: new Map(objekts.map(([id, owner, transferable]) => [id, { owner, transferable }])),
});

/** Any for both types, so the older tests read as before Can swap existed. */
function anyFor(...users: string[]) {
  return new Map(
    users.flatMap((user) =>
      (["want_match", "have_wanted"] as const).map((type) => [prefKey(user, type), "any" as const]),
    ),
  );
}

const input = (extra: Partial<AlertInput> = {}): AlertInput => ({
  pairs: [forward()],
  lists: new Map([SALE, WANT].map((l) => [l.id, l])),
  addresses: new Map([
    [SELLER, new Set([SELLER_ADDR])],
    [WANTER, new Set([WANTER_ADDR])],
  ]),
  holdings: holdings(),
  prefs: new Map(),
  matches: anyFor(SELLER, WANTER),
  ...extra,
});

const alertsOf = (value: AlertInput) => selectAlerts(value).alerts;

describe("selectAlerts, forward", () => {
  test("a new sale entry alerts the want list's owner", () => {
    expect(alertsOf(input())).toEqual([
      {
        type: "want_match",
        userId: WANTER,
        list: { id: WANT.id, slug: WANT.slug, name: WANT.name },
        key: { wantListId: WANT.id, sourceListId: SALE.id, collectionSlug: SLUG },
        match: { collectionSlug: SLUG, partnerName: "seller-name", sourceListSlug: SALE.slug },
        mode: "any",
      },
    ]);
  });

  test("own lists are skipped", () => {
    const ownWant = list(3, SELLER);
    const result = alertsOf(
      input({
        pairs: [forward({ wantListId: ownWant.id })],
        lists: new Map([SALE, ownWant].map((l) => [l.id, l])),
      }),
    );
    expect(result).toEqual([]);
  });

  test("a collection the seller no longer owns is skipped", () => {
    expect(alertsOf(input({ holdings: holdings([]) }))).toEqual([]);
  });

  test("a sold token entry is skipped", () => {
    const result = alertsOf(
      input({
        pairs: [forward({ objektId: "42" })],
        holdings: holdings([], [["42", "0xsomeoneelse", true]]),
      }),
    );
    expect(result).toEqual([]);
  });

  test("a non-transferable copy is skipped", () => {
    expect(alertsOf(input({ holdings: holdings([[SELLER_ADDR, SLUG, false]]) }))).toEqual([]);
    const token = alertsOf(
      input({
        pairs: [forward({ objektId: "42" })],
        holdings: holdings([], [["42", SELLER_ADDR, false]]),
      }),
    );
    expect(token).toEqual([]);
  });

  test("a wanter who already owns a copy is skipped, even a non-transferable one", () => {
    const result = alertsOf(
      input({
        holdings: holdings([
          [SELLER_ADDR, SLUG, true],
          [WANTER_ADDR, SLUG, false],
        ]),
      }),
    );
    expect(result).toEqual([]);
  });

  test("want_match off is skipped", () => {
    expect(alertsOf(input({ prefs: new Map([[prefKey(WANTER, "want_match"), false]]) }))).toEqual(
      [],
    );
  });

  test("one alert per key, ok when any of the list's entries is owned", () => {
    const result = alertsOf(
      input({
        pairs: [forward({ objektId: "41" }), forward({ objektId: "42" })],
        holdings: holdings([], [["42", SELLER_ADDR, true]]),
      }),
    );
    expect(result).toHaveLength(1);
  });
});

describe("selectAlerts, reverse", () => {
  const reverse = forward({ direction: "reverse" });

  test("on by default", () => {
    expect(alertsOf(input({ pairs: [reverse] })).map((alert) => alert.type)).toEqual([
      "have_wanted",
    ]);
  });

  test("off when turned off", () => {
    const off = new Map([[prefKey(SELLER, "have_wanted"), false]]);
    expect(alertsOf(input({ pairs: [reverse], prefs: off }))).toEqual([]);
  });

  test("when turned on, the have side's owner is told, grouped on their list", () => {
    const result = alertsOf(
      input({ pairs: [reverse], prefs: new Map([[prefKey(SELLER, "have_wanted"), true]]) }),
    );
    expect(result).toEqual([
      {
        type: "have_wanted",
        userId: SELLER,
        list: { id: SALE.id, slug: SALE.slug, name: SALE.name },
        key: { wantListId: WANT.id, sourceListId: SALE.id, collectionSlug: SLUG },
        match: { collectionSlug: SLUG, partnerName: "wanter-name", sourceListSlug: WANT.slug },
        mode: "any",
      },
    ]);
  });

  test("both directions new in one batch each alert, and one excluded does not hide the other", () => {
    const on = new Map([[prefKey(SELLER, "have_wanted"), true]]);
    const both = alertsOf(input({ pairs: [reverse, forward()], prefs: on }));
    expect(both.map((alert) => alert.type).toSorted()).toEqual(["have_wanted", "want_match"]);

    const off = new Map([[prefKey(SELLER, "have_wanted"), false]]);
    const forwardOnly = alertsOf(input({ pairs: [reverse, forward()], prefs: off }));
    expect(forwardOnly.map((alert) => alert.type)).toEqual(["want_match"]);
  });

  test("the same exclusions apply", () => {
    const on = new Map([[prefKey(SELLER, "have_wanted"), true]]);
    expect(alertsOf(input({ pairs: [reverse], prefs: on, holdings: holdings([]) }))).toEqual([]);
  });
});

describe("selectAlerts, unowned", () => {
  const reverse = forward({ direction: "reverse" });
  const on = new Map([[prefKey(SELLER, "have_wanted"), true]]);

  test("a forward pair the seller cannot trade yet is unowned", () => {
    expect(selectAlerts(input({ holdings: holdings([]) }))).toEqual({
      alerts: [],
      unowned: [forward()],
      notMutual: [],
    });
    expect(
      selectAlerts(input({ holdings: holdings([[SELLER_ADDR, SLUG, false]]) })).unowned,
    ).toEqual([forward()]);
  });

  test("a reverse pair whose have side is not held yet is unowned", () => {
    expect(
      selectAlerts(input({ pairs: [reverse], prefs: on, holdings: holdings([]) })).unowned,
    ).toEqual([reverse]);
  });

  test("an alert, a pref switched off or a wanter holding a copy is never unowned", () => {
    expect(selectAlerts(input()).unowned).toEqual([]);
    const off = new Map([[prefKey(SELLER, "have_wanted"), false]]);
    expect(
      selectAlerts(input({ pairs: [reverse], prefs: off, holdings: holdings([]) })).unowned,
    ).toEqual([]);
    expect(
      selectAlerts(input({ holdings: holdings([[WANTER_ADDR, SLUG, false]]) })).unowned,
    ).toEqual([]);
  });
});

describe("selectAlerts, Any or Can swap", () => {
  const reverse = forward({ direction: "reverse" });
  const mutualOnly = new Map();
  const saleList = list(1, SELLER, { sale: true });

  test("Any alerts on a one-sided match", () => {
    const { alerts } = selectAlerts(input());
    expect(alerts.map((alert) => alert.mode)).toEqual(["any"]);
  });

  test("a missing pref row means Can swap for both types", () => {
    const one = input({ matches: mutualOnly });
    expect(selectAlerts(one)).toEqual({ alerts: [], unowned: [], notMutual: [forward()] });
    const back = input({
      pairs: [reverse],
      prefs: new Map(),
      matches: mutualOnly,
    });
    expect(selectAlerts(back).notMutual).toEqual([reverse]);
  });

  test("Can swap alerts once the partner is mutual, and says so", () => {
    const one = input({ matches: mutualOnly });
    expect(mutualQuestions(one)).toEqual([
      {
        recipientId: WANTER,
        list: { id: WANT.id, slug: WANT.slug },
        partnerIds: new Set([SELLER]),
      },
    ]);
    const { alerts, notMutual } = selectAlerts(one, new Set([mutualKey(WANTER, WANT.id, SELLER)]));
    expect(alerts.map((alert) => [alert.userId, alert.mode])).toEqual([[WANTER, "mutual"]]);
    expect(notMutual).toEqual([]);
  });

  test("a sale-list pair under Can swap is neither alerted, asked nor rechecked", () => {
    const sale = input({
      matches: mutualOnly,
      lists: new Map([saleList, WANT].map((l) => [l.id, l])),
    });
    expect(mutualQuestions(sale)).toEqual([]);
    expect(selectAlerts(sale, new Set([mutualKey(WANTER, WANT.id, SELLER)]))).toEqual({
      alerts: [],
      unowned: [],
      notMutual: [],
    });
  });

  test("a recipient on Any is never asked", () => {
    expect(mutualQuestions(input())).toEqual([]);
  });

  test("mutual on another list of the recipient does not count", () => {
    const otherWant = list(4, WANTER);
    const one = input({ matches: mutualOnly });
    expect(selectAlerts(one, new Set([mutualKey(WANTER, otherWant.id, SELLER)])).alerts).toEqual(
      [],
    );
  });

  test("a reverse pair against the recipient's own sale list under Can swap is dropped", () => {
    const back = input({
      pairs: [reverse],
      matches: mutualOnly,
      lists: new Map([saleList, WANT].map((l) => [l.id, l])),
    });
    expect(mutualQuestions(back)).toEqual([]);
    expect(selectAlerts(back, new Set([mutualKey(SELLER, saleList.id, WANTER)]))).toEqual({
      alerts: [],
      unowned: [],
      notMutual: [],
    });
  });

  test("Off sends nothing and asks nothing", () => {
    const off = input({
      matches: mutualOnly,
      prefs: new Map([[prefKey(WANTER, "want_match"), false]]),
    });
    expect(mutualQuestions(off)).toEqual([]);
    expect(selectAlerts(off)).toEqual({ alerts: [], unowned: [], notMutual: [] });
  });

  test("an unowned pair is unowned, not not-mutual", () => {
    const one = input({ matches: mutualOnly, holdings: holdings([]) });
    expect(mutualQuestions(one)).toEqual([]);
    expect(selectAlerts(one)).toEqual({ alerts: [], unowned: [forward()], notMutual: [] });
  });
  describe("a list with no pair", () => {
    const unpairedWant = list(2, WANTER, { swapPair: false });
    const haveList = list(1, SELLER);
    const listsOf = (...all: AlertList[]) => new Map(all.map((l) => [l.id, l]));

    test("a want list on Can swap alerts on a one-way have listing, as Any, without asking", () => {
      const one = input({ matches: mutualOnly, lists: listsOf(haveList, unpairedWant) });
      expect(mutualQuestions(one)).toEqual([]);
      const { alerts, notMutual } = selectAlerts(one);
      expect(alerts.map((alert) => [alert.userId, alert.mode])).toEqual([[WANTER, "any"]]);
      expect(notMutual).toEqual([]);
    });

    test("a want list on Can swap skips a Sell only listing", () => {
      const one = input({ matches: mutualOnly, lists: listsOf(saleList, unpairedWant) });
      expect(mutualQuestions(one)).toEqual([]);
      expect(selectAlerts(one)).toEqual({ alerts: [], unowned: [], notMutual: [] });
    });

    test("a want list on Can swap that buys only skips a Sell or swap listing", () => {
      const buying = list(2, WANTER, { swapPair: false, wantsSwaps: false });
      const one = input({ matches: mutualOnly, lists: listsOf(haveList, buying) });
      expect(selectAlerts(one)).toEqual({ alerts: [], unowned: [], notMutual: [] });
    });

    test("a have list on Can swap alerts in reverse, as Any", () => {
      const back = input({
        pairs: [reverse],
        matches: mutualOnly,
        lists: listsOf(list(1, SELLER, { swapPair: false }), WANT),
      });
      expect(mutualQuestions(back)).toEqual([]);
      expect(selectAlerts(back).alerts.map((alert) => [alert.userId, alert.mode])).toEqual([
        [SELLER, "any"],
      ]);
    });

    test("a Sell or swap list on Can swap skips a want list that only buys", () => {
      const back = input({
        pairs: [reverse],
        matches: mutualOnly,
        lists: listsOf(
          list(1, SELLER, { swapPair: false }),
          list(2, WANTER, { wantsSwaps: false }),
        ),
      });
      expect(mutualQuestions(back)).toEqual([]);
      expect(selectAlerts(back)).toEqual({ alerts: [], unowned: [], notMutual: [] });
    });

    test("a Sell only list on Can swap skips a buyer", () => {
      const back = input({
        pairs: [reverse],
        matches: mutualOnly,
        lists: listsOf(list(1, SELLER, { sale: true, swapPair: false }), WANT),
      });
      expect(mutualQuestions(back)).toEqual([]);
      expect(selectAlerts(back)).toEqual({ alerts: [], unowned: [], notMutual: [] });
    });

    test("a paired list still asks the two-way question", () => {
      const one = input({
        matches: mutualOnly,
        lists: listsOf(list(1, SELLER, { swapPair: false }), WANT),
      });
      expect(mutualQuestions(one).map((ask) => ask.list.id)).toEqual([WANT.id]);
      expect(selectAlerts(one).notMutual).toEqual([forward()]);
    });
  });
});

describe("wholeEntries", () => {
  const rows = (...entries: number[]) => entries.map((entryId) => ({ entryId }));

  test("under the limit, everything and done", () => {
    expect(wholeEntries(rows(1, 1, 2), 3)).toEqual({ complete: true, taken: rows(1, 1, 2) });
  });

  test("past the limit, cut back to the last whole entry", () => {
    expect(wholeEntries(rows(1, 2, 2, 3), 3)).toEqual({
      complete: false,
      taken: rows(1, 2, 2),
      oversized: null,
    });
    expect(wholeEntries(rows(1, 2, 2, 2), 3)).toEqual({
      complete: false,
      taken: rows(1),
      oversized: null,
    });
  });

  test("a first entry that alone passes the limit is named, so it is read whole", () => {
    expect(wholeEntries(rows(5, 5, 5), 2)).toEqual({ complete: false, taken: [], oversized: 5 });
    expect(wholeEntries(rows(5), 0)).toEqual({ complete: false, taken: [], oversized: 5 });
  });
});

describe("listProgress", () => {
  const read = (listId: number, entryId: number) => ({ listId, entryId });

  test("read to the end: every pending list is done and nothing resumes", () => {
    expect(listProgress([3, 1], new Map([[3, 10]]), [read(1, 4)], true)).toEqual({
      done: [3, 1],
      progress: new Map(),
    });
  });

  test("stopped short: earlier lists are done, the reached one resumes, later ones keep theirs", () => {
    const result = listProgress(
      [1, 2, 3],
      new Map([
        [1, 5],
        [3, 7],
      ]),
      [read(1, 6), read(2, 8), read(2, 9)],
      false,
    );
    expect(result.done).toEqual([1]);
    expect(result.progress).toEqual(
      new Map([
        [3, 7],
        [2, 9],
      ]),
    );
  });
});
