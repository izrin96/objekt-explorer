import { describe, expect, test } from "bun:test";

import type { ActivityItem, ActivityParams } from "@repo/api/schemas/activity";
import { Addresses } from "@repo/lib";
import { fromPartial } from "@total-typescript/shoehorn";

import { addToFeed, advanceClock, emptyFeed, restartFeed } from "./live-feed";
import { pairLiveRewards, withPendingSpin } from "./live-spins";
import { foldSpinRows } from "./spin-rows";

const KEY: ActivityParams = {
  artist: [],
  member: [],
  season: [],
  class: [],
  on_offline: [],
  collection: [],
};

const WALLET = "0x00000000000000000000000000000000000000aa";

const ids = (items: ActivityItem[]) => items.map((i) => i.transfer.id);

describe("live spin rewards", () => {
  const T0 = Date.parse("2026-11-07T12:00:00Z");
  const at = (s: number) => new Date(T0 + s * 1000).toISOString();
  const spin = (id: string, s: number, extra: Partial<ActivityItem> = {}) =>
    withPendingSpin(
      fromPartial<ActivityItem>({
        transfer: { id, from: WALLET, to: Addresses.SPIN, timestamp: at(s) },
        objekt: { artist: "triples" },
        nickname: {},
        ...extra,
      }),
    );
  const mint = (id: string, s: number, extra: Partial<ActivityItem> = {}) =>
    fromPartial<ActivityItem>({
      transfer: { id, from: Addresses.NULL, to: WALLET, timestamp: at(s) },
      objekt: { artist: "triples" },
      nickname: {},
      ...extra,
    });

  test("a socket spin starts pending", () => {
    expect(spin("s", 0).spin).toEqual({ outcome: "pending" });
    expect(withPendingSpin(mint("m", 0)).spin).toBeUndefined();
  });

  test("a reward arriving after a live spin fills it, and All shows one row", () => {
    const s = spin("s", 0);
    const m = mint("m", 15);
    let feed = addToFeed(emptyFeed(KEY), KEY, [s], [], false);
    feed = pairLiveRewards(feed, KEY, [m], []);
    feed = addToFeed(feed, KEY, [m], [], false);
    expect(feed.rewards.get("s")?.transfer.id).toBe("m");
    const drawn = foldSpinRows(feed.rows, { all: true, faceted: false, rewards: feed.rewards });
    expect(ids(drawn)).toEqual(["s"]);
    expect(drawn[0]?.spin?.outcome).toBe("reward");
  });

  test("a reward fills a pending spin from the first page", () => {
    const paged = spin("s", 0);
    const feed = pairLiveRewards(emptyFeed(KEY), KEY, [mint("m", 15)], [paged]);
    expect(feed.rewards.get("s")?.transfer.id).toBe("m");
  });

  test("a Spin feed pairs a mint it never lists", () => {
    const feed = addToFeed(emptyFeed(KEY), KEY, [spin("s", 0)], [], false);
    const paired = pairLiveRewards(feed, KEY, [mint("m", 15)], []);
    expect(ids(paired.rows)).toEqual(["s"]);
    const [row] = foldSpinRows(paired.rows, {
      all: false,
      faceted: false,
      rewards: paired.rewards,
    });
    expect(row?.spin?.reward?.transfer.id).toBe("m");
  });

  test("a replayed batch pairs nothing twice", () => {
    const feed = addToFeed(emptyFeed(KEY), KEY, [spin("a", 0), spin("b", 5)], [], false);
    const once = pairLiveRewards(feed, KEY, [mint("m", 15)], []);
    const twice = pairLiveRewards(once, KEY, [mint("m", 15)], []);
    expect(twice).toBe(once);
    expect(twice.rewards.size).toBe(1);
    expect(twice.rewards.get("b")?.transfer.id).toBe("m");
  });

  test("a mint the server already paired stays with its spin", () => {
    const rewarded = spin("a", 0, {
      spin: {
        outcome: "reward",
        reward: { transfer: mint("m", 15).transfer, objekt: mint("m", 15).objekt },
      },
    });
    const feed = pairLiveRewards(emptyFeed(KEY), KEY, [mint("m", 15)], [rewarded, spin("b", 5)]);
    expect(feed.rewards.size).toBe(0);
  });

  test("a spin settled in a refetched page takes no live reward from its pending copy", () => {
    const live = addToFeed(emptyFeed(KEY), KEY, [spin("a", 0), spin("b", 5)], [], false);
    const refetched = spin("a", 0, {
      spin: {
        outcome: "reward",
        reward: { transfer: mint("ra", 15).transfer, objekt: mint("ra", 15).objekt },
      },
    });
    const feed = pairLiveRewards(live, KEY, [mint("m", 20)], [refetched]);
    expect(feed.rewards.has("a")).toBe(false);
    expect(feed.rewards.get("b")?.transfer.id).toBe("m");
  });

  test("restarting past the cap keeps the clock and only the first page's rewards", () => {
    const fed = pairLiveRewards(
      advanceClock(addToFeed(emptyFeed(KEY), KEY, [spin("s", 0)], [], false), KEY, [mint("m", 15)]),
      KEY,
      [mint("m", 15)],
      [],
    );
    const restarted = restartFeed(fed, KEY, [spin("s", 0)]);
    expect(restarted.rows).toEqual([]);
    expect(restarted.rewards.get("s")?.transfer.id).toBe("m");
    expect(restarted.clock).toBe(fed.clock);
    expect(restartFeed(fed, KEY, []).rewards.size).toBe(0);
  });

  test("the clock steps in 30 s, so most batches change nothing", () => {
    const feed = advanceClock(emptyFeed(KEY), KEY, [mint("m", 60)]);
    expect(advanceClock(feed, KEY, [mint("n", 75)])).toBe(feed);
    expect(advanceClock(feed, KEY, [mint("n", 95)]).clock).toBe(T0 + 90_000);
  });

  test("the clock follows every batch, rows the filter drops included", () => {
    const feed = advanceClock(emptyFeed(KEY), KEY, [mint("m", 700), spin("s", 5)]);
    expect(feed.clock).toBe(T0 + 690_000);
    expect(advanceClock(feed, KEY, [mint("old", 3)])).toBe(feed);
    const pending = foldSpinRows([spin("s", 0)], { all: false, faceted: true, clock: feed.clock });
    expect(pending[0]?.spin?.outcome).toBe("broke");
  });

  test("a live spin with no reward turns broke once the feed is 10 minutes past it", () => {
    const feed = addToFeed(emptyFeed(KEY), KEY, [spin("s", 0)], [], false);
    const outcome = (s: number) =>
      foldSpinRows(feed.rows, { all: true, faceted: false, clock: T0 + s * 1000 })[0]?.spin
        ?.outcome;
    expect(outcome(300)).toBe("pending");
    expect(outcome(601)).toBe("broke");
  });
});
