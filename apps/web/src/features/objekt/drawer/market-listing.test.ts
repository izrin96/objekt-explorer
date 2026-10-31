import { describe, expect, test } from "bun:test";

import type { ViewerMarketListing } from "@repo/api/schemas/market";
import { floorChange } from "@repo/api/schemas/price-history";
import { truncateAddress } from "@repo/lib/address";

import { formatUtcDay } from "@/features/market/format-utc-day";
import type { HistoryPoint } from "@/features/market/price-history-rows";
import { anyKey } from "@/features/offers/pick";
import { m } from "@/paraglide/messages";

import {
  floorTrend,
  isOwnListing,
  listingPrice,
  messageRequest,
  offerRequest,
  onTradeText,
  sellerOf,
  trackingText,
} from "./market-listing";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);

const ADDRESS = "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01";

const listing = (patch: Partial<ViewerMarketListing> = {}): ViewerMarketListing => ({
  id: 1,
  price: 10,
  isQyop: false,
  note: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  currency: "USD",
  usdPrice: 10,
  serial: 5,
  transferable: true,
  objektId: "obj-1",
  messageable: true,
  list: {
    slug: "my-list",
    profileSlug: null,
    profile: { nickname: "Seller", address: ADDRESS },
  },
  ...patch,
});

describe("sellerOf", () => {
  test("keeps a real nickname as the name", () => {
    const seller = sellerOf(listing());
    expect(seller).toEqual({ address: ADDRESS, nickname: "Seller", name: "Seller" });
  });

  test("drops a nickname that is the address in another case", () => {
    const item = listing({
      list: {
        slug: "l",
        profileSlug: null,
        profile: { nickname: ADDRESS.toLowerCase(), address: ADDRESS },
      },
    });
    const seller = sellerOf(item);
    expect(seller.nickname).toBeNull();
    expect(seller.name).toBe(truncateAddress(ADDRESS.toLowerCase()));
  });

  test("has no address or name without a profile", () => {
    const seller = sellerOf(listing({ list: { slug: "l", profileSlug: null, profile: null } }));
    expect(seller.address).toBeNull();
    expect(seller.nickname).toBeNull();
    expect(seller.name).toBeUndefined();
  });
});

describe("offerRequest", () => {
  test("keys the pick by the objekt id", () => {
    const request = offerRequest(listing(), "col-1");
    expect(request.to).toEqual({ target: { kind: "list", slug: "my-list" } });
    expect(request.startList).toBe("my-list");
    expect(request.name).toBe("Seller");
    expect(request.prefill?.get).toEqual([
      {
        key: "obj-1",
        collectionSlug: "col-1",
        objektId: "obj-1",
        serial: 5,
        listSlug: "my-list",
        flags: null,
      },
    ]);
  });

  test("falls back to the any-key when the list hides serials", () => {
    const pick = offerRequest(listing({ objektId: null }), "col-1").prefill?.get?.[0];
    expect(pick?.key).toBe(anyKey("col-1"));
    expect(pick?.objektId).toBeNull();
  });

  test("names an unknown seller generically", () => {
    const item = listing({ list: { slug: "l", profileSlug: null, profile: null } });
    check(offerRequest(item, "col-1").name).toBe(m.objekt_market_seller());
  });
});

describe("messageRequest", () => {
  test("targets the list and cards the objekt", () => {
    const [target, card] = messageRequest(listing(), "col-1");
    expect(target).toEqual({ kind: "list", slug: "my-list" });
    expect(card).toEqual({
      kind: "objekt",
      collectionSlug: "col-1",
      objektId: "obj-1",
      listSlug: "my-list",
    });
  });

  test("leaves the objekt id undefined, not null, when hidden", () => {
    const [, card] = messageRequest(listing({ objektId: null }), "col-1");
    expect(card.kind === "objekt" ? card.objektId : "wrong kind").toBeUndefined();
  });
});

describe("isOwnListing", () => {
  const item = listing();

  test("matches by list slug", () => {
    expect(isOwnListing(item, new Set(["my-list"]), [])).toBe(true);
  });

  test("matches by address in another case", () => {
    expect(isOwnListing(item, new Set(), [ADDRESS.toLowerCase()])).toBe(true);
  });

  test("is false without a profile or a slug match", () => {
    const noProfile = listing({ list: { slug: "l", profileSlug: null, profile: null } });
    expect(isOwnListing(noProfile, new Set(["other"]), [ADDRESS])).toBe(false);
  });

  test("is false with nothing to match against", () => {
    expect(isOwnListing(item, new Set(), [])).toBe(false);
  });
});

describe("listingPrice", () => {
  const formatListed = (amount: number, code: string) => `${amount} ${code}`;
  const formatUsd = (usd: number) => `$${usd}`;
  const price = (patch: Partial<ViewerMarketListing>, viewer = "USD") =>
    listingPrice(listing(patch), viewer, formatListed, formatUsd);

  test("shows QYOP over a price", () => {
    const result = price({ isQyop: true, price: 5, currency: "KRW", usdPrice: 1 }, "USD");
    check(result.label).toBe(m.objekt_qyop());
    expect(result.priced).toBe(false);
    expect(result.converted).toBeNull();
  });

  test("formats the price in the seller's currency", () => {
    const result = price({ price: 12, currency: "USD" });
    expect(result).toEqual({ label: "12 USD", priced: true, converted: null });
  });

  test("converts when the currency differs from the viewer's", () => {
    const result = price({ price: 5000, currency: "KRW", usdPrice: 4 });
    expect(result.label).toBe("5000 KRW");
    expect(result.converted).toBe(formatUsd(4));
  });

  test("skips the conversion without a usd price", () => {
    expect(price({ price: 5000, currency: "KRW", usdPrice: null }).converted).toBeNull();
  });

  test("shows a dash without a price or a currency", () => {
    expect(price({ price: null })).toEqual({ label: "—", priced: false, converted: null });
    expect(price({ currency: null })).toEqual({ label: "—", priced: false, converted: null });
  });
});

describe("onTradeText", () => {
  test("is null at zero on both sides", () => {
    expect(onTradeText({ have: 0, want: 0 })).toBeNull();
  });

  test("lists the have count alone", () => {
    check(onTradeText({ have: 3, want: 0 })).toBe(
      [m.objekt_market_on_trade(), m.objekt_market_on_trade_have({ count: 3 })].join(" · "),
    );
  });

  test("lists the want count alone", () => {
    check(onTradeText({ have: 0, want: 4 })).toBe(
      [m.objekt_market_on_trade(), m.objekt_market_on_trade_want({ count: 4 })].join(" · "),
    );
  });

  test("lists both", () => {
    check(onTradeText({ have: 3, want: 4 })).toBe(
      [
        m.objekt_market_on_trade(),
        m.objekt_market_on_trade_have({ count: 3 }),
        m.objekt_market_on_trade_want({ count: 4 }),
      ].join(" · "),
    );
  });
});

describe("trackingText", () => {
  const today = "2026-03-10";

  test("says started for one snapshot taken today", () => {
    check(trackingText({ since: today, snapshots: 1 }, today)).toBe(
      m.objekt_market_tracking_started({ date: formatUtcDay(today) }),
    );
  });

  test("says since for one snapshot from an earlier day", () => {
    check(trackingText({ since: "2026-03-09", snapshots: 1 }, today)).toBe(
      m.objekt_market_tracking_since({ date: formatUtcDay("2026-03-09") }),
    );
  });

  test("says since for several snapshots", () => {
    check(trackingText({ since: today, snapshots: 2 }, today)).toBe(
      m.objekt_market_tracking_since({ date: formatUtcDay(today) }),
    );
  });
});

describe("floorTrend", () => {
  const today = "2026-03-10";
  const day = (offset: number) =>
    new Date(Date.parse(today) + offset * 86_400_000).toISOString().slice(0, 10);
  const point = (date: string, floorUsd: number): HistoryPoint => ({
    date,
    floorUsd,
    medianUsd: floorUsd,
    listingCount: 1,
  });
  const week = [2, 3, 4, 5, 6, 7, 8].map((floor, i) => point(day(i - 6), floor));

  test("shows no trend under seven points", () => {
    expect(floorTrend(week.slice(0, 6), 3, today)).toEqual({ change: null, sparkline: null });
  });

  test("measures the change from the first floor to the live one", () => {
    const { change, sparkline } = floorTrend(week, 3, today);
    expect(change).toBe(floorChange(2, 3));
    expect(change).toBe(0.5);
    expect(sparkline).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  test("has no change without a live floor", () => {
    const { change, sparkline } = floorTrend(week, null, today);
    expect(change).toBeNull();
    expect(sparkline).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  test("has no change from a zero first floor", () => {
    const points = [point(day(-6), 0), ...week.slice(1)];
    expect(floorTrend(points, 3, today).change).toBeNull();
  });

  test("leaves a null for a gap and for days since the last record", () => {
    const points = [-9, -8, -7, -6, -4, -3, -2].map((offset) => point(day(offset), 1));
    const { sparkline } = floorTrend(points, 1, today);
    expect(sparkline).toEqual([1, 1, 1, 1, null, 1, 1, 1, null, null]);
  });
});
