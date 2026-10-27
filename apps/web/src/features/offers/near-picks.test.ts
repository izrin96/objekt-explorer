import { describe, expect, test } from "bun:test";

import { type NearGroup, nearPayer, takeNear, withNear } from "./near-picks";
import type { OfferPick } from "./pick";

const pick = (key: string, collectionSlug = key): OfferPick => ({
  key,
  collectionSlug,
  objektId: key,
  serial: null,
  listSlug: null,
  flags: null,
});

describe("nearPayer", () => {
  test("they pay for what the viewer sells, the viewer for what they sell, nobody for a swap", () => {
    expect(nearPayer("sell")).toBe("to");
    expect(nearPayer("buy")).toBe("from");
    expect(nearPayer("swap")).toBeNull();
  });
});

describe("withNear", () => {
  const group: NearGroup = { side: "give", verb: "sell", picks: [pick("1"), pick("2")] };

  test("adds the group's picks after the side's, skipping one already held", () => {
    const { picks, added } = withNear([pick("2"), pick("3")], group, 50);
    expect(picks.map((p) => p.key)).toEqual(["2", "3", "1"]);
    expect(added.map((p) => p.key)).toEqual(["1"]);
  });

  test("stops at the side's limit", () => {
    const { picks, added } = withNear([pick("3"), pick("4")], group, 3);
    expect(picks.map((p) => p.key)).toEqual(["3", "4", "1"]);
    expect(added.map((p) => p.key)).toEqual(["1"]);
    expect(withNear([pick("3"), pick("4")], group, 2).added).toEqual([]);
  });
});

describe("takeNear", () => {
  const sell: NearGroup = { side: "give", verb: "sell", picks: [pick("1", "a"), pick("2", "b")] };
  const buy: NearGroup = { side: "get", verb: "buy", picks: [pick("3", "c")] };

  test("takes the one pick on that collection and leaves the rest of its group waiting", () => {
    const { taken, left } = takeNear([sell, buy], "b");
    expect(taken).toEqual({ side: "give", verb: "sell", pick: pick("2", "b") });
    expect(left).toEqual([{ ...sell, picks: [pick("1", "a")] }, buy]);
  });

  test("takes from a later group, which goes once emptied", () => {
    const { taken, left } = takeNear([sell, buy], "c");
    expect(taken).toEqual({ side: "get", verb: "buy", pick: pick("3", "c") });
    expect(left).toEqual([sell]);
  });

  test("no slug, or none near, takes nothing", () => {
    expect(takeNear([sell], undefined)).toEqual({ taken: null, left: [sell] });
    expect(takeNear([sell], "z").taken).toBeNull();
  });
});
