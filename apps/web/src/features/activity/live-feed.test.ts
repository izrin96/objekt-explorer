import { describe, expect, test } from "bun:test";

import type { ActivityItem, ActivityParams } from "@repo/api/schemas/activity";
import { Addresses } from "@repo/lib";

import {
  addToFeed,
  emptyFeed,
  getEventKind,
  matchesFilters,
  mergeRows,
  releaseQueued,
} from "./live-feed";

const KEY: ActivityParams = {
  artist: [],
  member: [],
  season: [],
  class: [],
  on_offline: [],
  collection: [],
};

const WALLET = "0x00000000000000000000000000000000000000aa";

function item(
  id: string,
  {
    from = WALLET,
    to = WALLET,
    ...objekt
  }: { from?: string; to?: string } & Partial<ActivityItem["objekt"]> = {},
): ActivityItem {
  return {
    transfer: { id, from, to },
    objekt: {
      artist: "tripleS",
      member: "JiWoo",
      season: "Divine01",
      class: "Double",
      onOffline: "online",
      collectionNo: "333Z",
      ...objekt,
    },
  } as ActivityItem;
}

const ids = (items: ActivityItem[]) => items.map((i) => i.transfer.id);

describe("getEventKind", () => {
  test("tells a mint, a spin and a transfer apart", () => {
    expect(getEventKind(Addresses.NULL, WALLET)).toBe("mint");
    expect(getEventKind(WALLET, Addresses.SPIN)).toBe("spin");
    expect(getEventKind(WALLET, WALLET)).toBe("transfer");
  });
});

describe("matchesFilters", () => {
  test("keeps every row with no filter set", () => {
    expect(matchesFilters(item("1"), "all", [], {})).toBe(true);
  });

  test("filters by event type", () => {
    const spin = item("1", { to: Addresses.SPIN });
    expect(matchesFilters(spin, "spin", [], {})).toBe(true);
    expect(matchesFilters(spin, "transfer", [], {})).toBe(false);
  });

  test("matches the artist without regard to case", () => {
    expect(matchesFilters(item("1"), "all", ["TRIPLES"], {})).toBe(true);
    expect(matchesFilters(item("1"), "all", ["artms"], {})).toBe(false);
  });

  test("applies each facet the request sent", () => {
    const row = item("1");
    expect(matchesFilters(row, "all", [], { member: ["JiWoo"] })).toBe(true);
    expect(matchesFilters(row, "all", [], { member: ["Kaede"] })).toBe(false);
    expect(matchesFilters(row, "all", [], { season: ["Atom01"] })).toBe(false);
    expect(matchesFilters(row, "all", [], { class: ["First"] })).toBe(false);
    expect(matchesFilters(row, "all", [], { on_offline: ["offline"] })).toBe(false);
    expect(matchesFilters(row, "all", [], { collection: ["101Z"] })).toBe(false);
  });
});

describe("addToFeed", () => {
  test("puts a batch on top and marks it new", () => {
    const prev = addToFeed(emptyFeed(KEY), KEY, [item("a")], [], false);
    const next = addToFeed(prev, KEY, [item("b"), item("c")], [], false);
    expect(ids(next.rows)).toEqual(["b", "c", "a"]);
    expect([...next.newIds]).toEqual(["b", "c"]);
  });

  test("drops rows the feed or the first page already holds", () => {
    const prev = addToFeed(emptyFeed(KEY), KEY, [item("a")], [], false);
    const next = addToFeed(prev, KEY, [item("a"), item("p"), item("b")], [item("p")], false);
    expect(ids(next.rows)).toEqual(["b", "a"]);
  });

  test("returns the same feed when nothing is new", () => {
    const prev = addToFeed(emptyFeed(KEY), KEY, [item("a")], [], false);
    expect(addToFeed(prev, KEY, [item("a")], [], false)).toBe(prev);
  });

  test("queues a batch while held, without marking it new", () => {
    const prev = addToFeed(emptyFeed(KEY), KEY, [item("a")], [], false);
    const next = addToFeed(prev, KEY, [item("b")], [], true);
    expect(ids(next.rows)).toEqual(["a"]);
    expect(ids(next.queued)).toEqual(["b"]);
    expect([...next.newIds]).toEqual(["a"]);
  });

  test("does not queue a row twice", () => {
    const prev = addToFeed(emptyFeed(KEY), KEY, [item("b")], [], true);
    expect(addToFeed(prev, KEY, [item("b")], [], true)).toBe(prev);
  });

  test("ignores a batch for a feed that belongs to another request", () => {
    const other = emptyFeed({ ...KEY, member: ["Kaede"] });
    expect(addToFeed(other, KEY, [item("a")], [], false)).toBe(other);
  });
});

describe("releaseQueued", () => {
  test("moves the held rows on top and marks them new", () => {
    const shown = addToFeed(emptyFeed(KEY), KEY, [item("a")], [], false);
    const held = addToFeed(
      addToFeed(shown, KEY, [item("b")], [], true),
      KEY,
      [item("c")],
      [],
      true,
    );
    const released = releaseQueued(held);
    expect(ids(released.rows)).toEqual(["c", "b", "a"]);
    expect(released.queued).toEqual([]);
    expect([...released.newIds]).toEqual(["c", "b"]);
  });

  test("returns the same feed when nothing is held", () => {
    const feed = addToFeed(emptyFeed(KEY), KEY, [item("a")], [], false);
    expect(releaseQueued(feed)).toBe(feed);
  });
});

describe("mergeRows", () => {
  test("puts live rows above the pages and drops the ones a refetch already holds", () => {
    expect(ids(mergeRows([item("c"), item("b")], [item("b"), item("a")]))).toEqual(["c", "b", "a"]);
  });
});
