import { describe, expect, test } from "bun:test";

import { copyKey, type Holdings } from "@repo/api/lib/trade-rank";

import {
  type AlertInput,
  type AlertList,
  type AlertPair,
  hiddenKey,
  prefKey,
  selectAlerts,
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
  matchAlerts: true,
  ownerName: `${userId}-name`,
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

const input = (extra: Partial<AlertInput> = {}): AlertInput => ({
  pairs: [forward()],
  lists: new Map([SALE, WANT].map((l) => [l.id, l])),
  addresses: new Map([
    [SELLER, new Set([SELLER_ADDR])],
    [WANTER, new Set([WANTER_ADDR])],
  ]),
  holdings: holdings(),
  prefs: new Map(),
  hidden: new Set(),
  ...extra,
});

describe("selectAlerts, forward", () => {
  test("a new sale entry alerts the want list's owner", () => {
    expect(selectAlerts(input())).toEqual([
      {
        type: "want_match",
        userId: WANTER,
        list: { id: WANT.id, slug: WANT.slug, name: WANT.name },
        key: { wantListId: WANT.id, sourceListId: SALE.id, collectionSlug: SLUG },
        match: { collectionSlug: SLUG, partnerName: "seller-name", sourceListSlug: SALE.slug },
      },
    ]);
  });

  test("own lists are skipped", () => {
    const ownWant = list(3, SELLER);
    const result = selectAlerts(
      input({
        pairs: [forward({ wantListId: ownWant.id })],
        lists: new Map([SALE, ownWant].map((l) => [l.id, l])),
      }),
    );
    expect(result).toEqual([]);
  });

  test("a hidden partner is skipped", () => {
    expect(selectAlerts(input({ hidden: new Set([hiddenKey(WANTER, SELLER)]) }))).toEqual([]);
  });

  test("a collection the seller no longer owns is skipped", () => {
    expect(selectAlerts(input({ holdings: holdings([]) }))).toEqual([]);
  });

  test("a sold token entry is skipped", () => {
    const result = selectAlerts(
      input({
        pairs: [forward({ objektId: "42" })],
        holdings: holdings([], [["42", "0xsomeoneelse", true]]),
      }),
    );
    expect(result).toEqual([]);
  });

  test("a non-transferable copy is skipped", () => {
    expect(selectAlerts(input({ holdings: holdings([[SELLER_ADDR, SLUG, false]]) }))).toEqual([]);
    const token = selectAlerts(
      input({
        pairs: [forward({ objektId: "42" })],
        holdings: holdings([], [["42", SELLER_ADDR, false]]),
      }),
    );
    expect(token).toEqual([]);
  });

  test("a wanter who already owns a copy is skipped, even a non-transferable one", () => {
    const result = selectAlerts(
      input({
        holdings: holdings([
          [SELLER_ADDR, SLUG, true],
          [WANTER_ADDR, SLUG, false],
        ]),
      }),
    );
    expect(result).toEqual([]);
  });

  test("Alert me off on the want list is skipped", () => {
    const quiet = { ...WANT, matchAlerts: false };
    expect(selectAlerts(input({ lists: new Map([SALE, quiet].map((l) => [l.id, l])) }))).toEqual(
      [],
    );
  });

  test("want_match off is skipped", () => {
    expect(
      selectAlerts(input({ prefs: new Map([[prefKey(WANTER, "want_match"), false]]) })),
    ).toEqual([]);
  });

  test("one alert per key, ok when any of the list's entries is owned", () => {
    const result = selectAlerts(
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

  test("off by default", () => {
    expect(selectAlerts(input({ pairs: [reverse] }))).toEqual([]);
  });

  test("when turned on, the have side's owner is told, grouped on their list", () => {
    const result = selectAlerts(
      input({ pairs: [reverse], prefs: new Map([[prefKey(SELLER, "have_wanted"), true]]) }),
    );
    expect(result).toEqual([
      {
        type: "have_wanted",
        userId: SELLER,
        list: { id: SALE.id, slug: SALE.slug, name: SALE.name },
        key: { wantListId: WANT.id, sourceListId: SALE.id, collectionSlug: SLUG },
        match: { collectionSlug: SLUG, partnerName: "wanter-name", sourceListSlug: WANT.slug },
      },
    ]);
  });

  test("both directions new in one batch each alert, and one excluded does not hide the other", () => {
    const on = new Map([[prefKey(SELLER, "have_wanted"), true]]);
    const both = selectAlerts(input({ pairs: [reverse, forward()], prefs: on }));
    expect(both.map((alert) => alert.type).toSorted()).toEqual(["have_wanted", "want_match"]);

    const forwardOnly = selectAlerts(input({ pairs: [reverse, forward()] }));
    expect(forwardOnly.map((alert) => alert.type)).toEqual(["want_match"]);
  });

  test("the same exclusions apply", () => {
    const on = new Map([[prefKey(SELLER, "have_wanted"), true]]);
    expect(
      selectAlerts(
        input({ pairs: [reverse], prefs: on, hidden: new Set([hiddenKey(SELLER, WANTER)]) }),
      ),
    ).toEqual([]);
    expect(selectAlerts(input({ pairs: [reverse], prefs: on, holdings: holdings([]) }))).toEqual(
      [],
    );
    const quiet = { ...SALE, matchAlerts: false };
    expect(
      selectAlerts(
        input({ pairs: [reverse], prefs: on, lists: new Map([quiet, WANT].map((l) => [l.id, l])) }),
      ),
    ).toEqual([]);
  });
});
