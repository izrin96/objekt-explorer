import { describe, expect, test } from "bun:test";

import {
  batchMatters,
  expiredOutcome,
  type LegResult,
  type MatchLeg,
  type MatchTransfer,
  matchLegs,
  tradeOutcome,
} from "./trade-match";

const GIVER = "0xgiver";
const GIVER_2 = "0xgiver2";
const RECEIVER = "0xreceiver";
const THIRD = "0xthird";
const COLLECTION = "c0ffee00-0000-0000-0000-000000000001";
const START = "2026-10-01T00:00:00.000Z";
const ACCEPTED = "2026-10-01T12:00:00.000Z";
const BEFORE_ACCEPT = (s: number) => `2026-10-01T06:00:${String(s).padStart(2, "0")}.000Z`;

const leg = (overrides: Partial<MatchLeg> = {}): MatchLeg => ({
  id: 1,
  objektId: "1203",
  collectionId: COLLECTION,
  windowStart: START,
  acceptedAt: ACCEPTED,
  giver: new Set([GIVER, GIVER_2]),
  receiver: new Set([RECEIVER]),
  ...overrides,
});

let seq = 0;
const transfer = (overrides: Partial<MatchTransfer> = {}): MatchTransfer => {
  seq += 1;
  return {
    id: `t${seq}`,
    from: GIVER,
    to: RECEIVER,
    timestamp: `2026-10-02T00:00:${String(seq % 60).padStart(2, "0")}.000Z`,
    hash: `0xhash${seq}`,
    objektId: "1203",
    collectionId: COLLECTION,
    ...overrides,
  };
};

describe("matchLegs: a specific objekt", () => {
  test("verifies on the transfer from giver to receiver", () => {
    const t = transfer();
    expect(matchLegs([leg()], [t]).get(1)).toEqual({
      kind: "verified",
      transferId: t.id,
      txHash: t.hash,
      objektId: "1203",
      at: t.timestamp,
    });
  });

  test("a move between the giver's own addresses is skipped, then it verifies", () => {
    const own = transfer({ to: GIVER_2 });
    const sent = transfer({ from: GIVER_2 });
    const result = matchLegs([leg()], [sent, own]).get(1);
    expect(result).toMatchObject({ kind: "verified", transferId: sent.id });
  });

  test("broken when it goes to a third party first", () => {
    const sold = transfer({ to: THIRD });
    const late = transfer();
    expect(matchLegs([leg()], [late, sold]).get(1)).toEqual({
      kind: "broken",
      transferId: sold.id,
    });
  });

  test("a transfer before the window is ignored", () => {
    const early = transfer({ to: THIRD, timestamp: "2026-09-30T23:59:59.000Z" });
    expect(matchLegs([leg({ acceptedAt: START })], [early]).get(1)).toEqual({ kind: "pending" });
    const sent = transfer();
    expect(matchLegs([leg()], [early, sent]).get(1)).toMatchObject({ kind: "verified" });
  });

  test("addresses match in any case", () => {
    const t = transfer({ from: "0xGIVER", to: "0xReceiver" });
    const result = matchLegs([leg({ giver: new Set(["0xGiver"]) })], [t]).get(1);
    expect(result).toMatchObject({ kind: "verified", transferId: t.id });
  });

  test("another objekt's transfer does not count", () => {
    expect(matchLegs([leg()], [transfer({ objektId: "999" })]).get(1)).toEqual({
      kind: "pending",
    });
  });
});

describe("matchLegs: moves before the accept", () => {
  const UNLINKED = "0xformerlyours";

  test("sold and bought back before the accept: skipped, then the send verifies", () => {
    const sold = transfer({ to: THIRD, timestamp: BEFORE_ACCEPT(1) });
    const back = transfer({ from: THIRD, to: GIVER, timestamp: BEFORE_ACCEPT(2) });
    const sent = transfer();
    expect(matchLegs([leg()], [sold, back, sent]).get(1)).toMatchObject({
      kind: "verified",
      transferId: sent.id,
    });
  });

  test("moved to a since-unlinked own address before the accept: not broken", () => {
    const out = transfer({ to: UNLINKED, timestamp: BEFORE_ACCEPT(3) });
    const home = transfer({ from: UNLINKED, to: GIVER, timestamp: BEFORE_ACCEPT(4) });
    expect(matchLegs([leg()], [out, home]).get(1)).toEqual({ kind: "pending" });
    const sent = transfer();
    expect(matchLegs([leg()], [out, home, sent]).get(1)).toMatchObject({ kind: "verified" });
  });

  test("a send before the accept still verifies", () => {
    const early = transfer({ timestamp: BEFORE_ACCEPT(5) });
    expect(matchLegs([leg()], [early]).get(1)).toMatchObject({ kind: "verified" });
  });

  test("sold before the accept and never back breaks the leg, though the accept missed it", () => {
    // the indexer lagged the accept, so the accept still saw the objekt with the giver
    const sold = transfer({ to: THIRD, timestamp: BEFORE_ACCEPT(6) });
    expect(matchLegs([leg()], [sold]).get(1)).toEqual({ kind: "broken", transferId: sold.id });
    const resold = transfer({ from: THIRD, to: "0xfourth", timestamp: BEFORE_ACCEPT(7) });
    expect(matchLegs([leg()], [sold, resold]).get(1)).toEqual({
      kind: "broken",
      transferId: sold.id,
    });
  });

  test("the same move after the accept breaks the leg", () => {
    const sold = transfer({ to: THIRD });
    expect(matchLegs([leg()], [sold]).get(1)).toEqual({ kind: "broken", transferId: sold.id });
  });
});

describe("matchLegs: any copy", () => {
  const anyCopy = (id: number) => leg({ id, objektId: null });

  test("two any-copy legs need two transfers", () => {
    const first = transfer({ objektId: "1" });
    const one = matchLegs([anyCopy(1), anyCopy(2)], [first]);
    expect(one.get(1)).toMatchObject({ kind: "verified", transferId: first.id, objektId: "1" });
    expect(one.get(2)).toEqual({ kind: "pending" });

    const second = transfer({ objektId: "2" });
    const both = matchLegs([anyCopy(1), anyCopy(2)], [second, first]);
    expect(both.get(1)).toMatchObject({ transferId: first.id });
    expect(both.get(2)).toMatchObject({ transferId: second.id });
  });

  test("never breaks on a transfer elsewhere", () => {
    expect(matchLegs([anyCopy(1)], [transfer({ to: THIRD })]).get(1)).toEqual({ kind: "pending" });
  });

  test("a specific leg keeps its own token from an any-copy leg of the same collection", () => {
    const t = transfer();
    const results = matchLegs([anyCopy(1), leg({ id: 2 })], [t]);
    expect(results.get(2)).toMatchObject({ kind: "verified", transferId: t.id });
    expect(results.get(1)).toEqual({ kind: "pending" });
  });
});

describe("matchLegs: used transfers", () => {
  test("a transfer already used by another leg is skipped", () => {
    const t = transfer({ objektId: "5" });
    const anyCopy = leg({ objektId: null });
    expect(matchLegs([anyCopy], [t], new Set([t.id])).get(1)).toEqual({ kind: "pending" });
    const specific = leg({ objektId: "5" });
    expect(matchLegs([specific], [t], new Set([t.id])).get(1)).toEqual({ kind: "pending" });
  });
});

describe("tradeOutcome", () => {
  const v: LegResult = { kind: "verified", transferId: "t", txHash: "h", objektId: "1", at: START };
  const b: LegResult = { kind: "broken", transferId: "t" };
  const p: LegResult = { kind: "pending" };

  test("completes when every open leg verifies", () => {
    expect(tradeOutcome([v, v], 0)).toEqual({ status: "completed" });
    expect(tradeOutcome([v], 1)).toEqual({ status: "completed" });
  });

  test("stays in progress while a leg waits", () => {
    expect(tradeOutcome([v, p], 0)).toEqual({ status: "in_progress" });
  });

  test("a break before any verified leg cancels; after one, fails", () => {
    expect(tradeOutcome([b, p], 0)).toEqual({ status: "cancelled", reason: "token_moved" });
    expect(tradeOutcome([b], 1)).toEqual({ status: "failed" });
    expect(tradeOutcome([b, v], 0)).toEqual({ status: "failed" });
  });
});

describe("expiredOutcome", () => {
  test("fails once a leg verified, else cancels", () => {
    expect(expiredOutcome(0)).toBe("cancelled");
    expect(expiredOutcome(1)).toBe("failed");
  });
});

describe("batchMatters", () => {
  const watch = { objekts: new Set(["16396147"]), collections: new Set([COLLECTION]) };
  // the indexer publishes Subsquid entities: ids nested, and no flat objektId/collectionId
  const published = (objektId: string, collectionId: string) =>
    JSON.stringify([
      {
        id: "019c219a-22c1-720c-8e65-a487b8f0399a",
        from: GIVER,
        to: RECEIVER,
        timestamp: "2025-11-09T12:47:10.000Z",
        tokenId: objektId,
        hash: "0xhash",
        objekt: { id: objektId, owner: RECEIVER, serial: 2, transferable: true },
        collection: { id: collectionId, slug: "atom02-seoyeon-118z" },
      },
    ]);

  test("matches a watched objekt in the indexer's payload", () => {
    expect(batchMatters(published("16396147", "other-collection"), watch)).toBe(true);
  });

  test("matches a watched collection", () => {
    expect(batchMatters(published("1", COLLECTION), watch)).toBe(true);
  });

  test("falls back to tokenId when the objekt isn't nested", () => {
    const flat = JSON.stringify([{ tokenId: "16396147", collection: null }]);
    expect(batchMatters(flat, watch)).toBe(true);
  });

  test("ignores unwatched batches and junk", () => {
    expect(batchMatters(published("1", "other-collection"), watch)).toBe(false);
    expect(batchMatters("not json", watch)).toBe(false);
    expect(batchMatters("{}", watch)).toBe(false);
  });
});
