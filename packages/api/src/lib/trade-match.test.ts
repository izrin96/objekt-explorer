import { describe, expect, test } from "bun:test";

import {
  batchMatters,
  copyDue,
  copyReminderDue,
  copyRescue,
  copyReads,
  copyWindowStart,
  dueCopy,
  expiredOutcome,
  firstPending,
  giversOf,
  legVerifiedNoted,
  type LegResult,
  type MatchLeg,
  type MatchTransfer,
  reminderCopy,
  matchLegs as matchAll,
  nearMisses,
  stuckChange,
  tradeOutcome,
  transferKey,
} from "./trade-match";

const matchLegs = (...args: Parameters<typeof matchAll>) => matchAll(...args).results;

const GIVER = "0xgiver";
const GIVER_2 = "0xgiver2";
const RECEIVER = "0xreceiver";
const THIRD = "0xthird";
const RECEIVER_2 = "0xreceiver2";
const COLLECTION = "c0ffee00-0000-0000-0000-000000000001";
const START = "2026-10-01T00:00:00.000Z";
const ACCEPTED = "2026-10-01T12:00:00.000Z";
const BEFORE_ACCEPT = (s: number) => `2026-10-01T06:00:${String(s).padStart(2, "0")}.000Z`;

const leg = (overrides: Partial<MatchLeg> = {}): MatchLeg => ({
  id: 1,
  objektId: "1203",
  collectionId: COLLECTION,
  windowStart: START,
  copyWindowStart: copyWindowStart(ACCEPTED),
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
    tokenId: overrides.objektId ?? "1203",
    objektId: "1203",
    collectionId: COLLECTION,
    ...overrides,
  };
};
const minutesBeforeAccept = (minutes: number) =>
  new Date(new Date(ACCEPTED).getTime() - minutes * 60 * 1000).toISOString();

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
      at: sold.timestamp,
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

  test("a send the receiver returned before the accept doesn't verify; the next send does", () => {
    const early = transfer({ timestamp: BEFORE_ACCEPT(8) });
    const returned = transfer({ from: RECEIVER, to: GIVER, timestamp: BEFORE_ACCEPT(9) });
    expect(matchLegs([leg()], [early, returned]).get(1)).toEqual({ kind: "pending" });
    const sent = transfer();
    expect(matchLegs([leg()], [early, returned, sent]).get(1)).toMatchObject({
      kind: "verified",
      transferId: sent.id,
    });
  });

  test("an early send moved between the receiver's own wallets still verifies", () => {
    const early = transfer({ timestamp: BEFORE_ACCEPT(11) });
    const own = transfer({ from: RECEIVER, to: RECEIVER_2, timestamp: BEFORE_ACCEPT(12) });
    expect(
      matchLegs([leg({ receiver: new Set([RECEIVER, RECEIVER_2]) })], [early, own]).get(1),
    ).toMatchObject({ kind: "verified", transferId: early.id });
  });

  test("an early send passed on before the accept still verifies: the giver delivered", () => {
    const early = transfer({ timestamp: BEFORE_ACCEPT(13) });
    const onward = transfer({ from: RECEIVER, to: THIRD, timestamp: BEFORE_ACCEPT(14) });
    expect(matchLegs([leg()], [early, onward]).get(1)).toMatchObject({
      kind: "verified",
      transferId: early.id,
    });
  });

  test("an early send routed back to the giver through another wallet doesn't verify", () => {
    const early = transfer({ timestamp: BEFORE_ACCEPT(15) });
    const out = transfer({ from: RECEIVER, to: THIRD, timestamp: BEFORE_ACCEPT(16) });
    const home = transfer({ from: THIRD, to: GIVER, timestamp: BEFORE_ACCEPT(17) });
    expect(matchLegs([leg()], [early, out, home]).get(1)).toEqual({ kind: "pending" });
  });

  test("returned to another giver wallet and sold before the accept breaks the leg", () => {
    const early = transfer({ timestamp: BEFORE_ACCEPT(18) });
    const back = transfer({ from: RECEIVER, to: GIVER_2, timestamp: BEFORE_ACCEPT(19) });
    const sold = transfer({ from: GIVER_2, to: THIRD, timestamp: BEFORE_ACCEPT(20) });
    expect(
      matchLegs([leg({ giver: new Set([GIVER, GIVER_2]) })], [early, back, sold]).get(1),
    ).toMatchObject({ kind: "broken", transferId: sold.id });
  });

  test("sent, returned and sent again credits the last send", () => {
    const first = transfer({ timestamp: BEFORE_ACCEPT(21) });
    const back = transfer({ from: RECEIVER, to: GIVER, timestamp: BEFORE_ACCEPT(22) });
    const again = transfer({ timestamp: BEFORE_ACCEPT(23) });
    expect(matchLegs([leg()], [first, back, again]).get(1)).toMatchObject({
      kind: "verified",
      transferId: again.id,
    });
  });

  test("a giver wallet move in the same block as the send leaves it verified, in either order", () => {
    const at = BEFORE_ACCEPT(24);
    const giverLeg = leg({ giver: new Set([GIVER, GIVER_2]) });
    // ties sort by id, so the two ids decide which comes first
    for (const [consolidateId, sendId] of [
      ["a", "z"],
      ["z", "a"],
    ]) {
      const consolidate = transfer({ id: consolidateId, from: GIVER_2, to: GIVER, timestamp: at });
      const send = transfer({ id: sendId, timestamp: at });
      expect(matchLegs([giverLeg], [consolidate, send]).get(1)).toMatchObject({
        kind: "verified",
        transferId: sendId,
      });
    }
  });

  test("a receiver passing the objekt on after the accept still leaves the early send verified", () => {
    const early = transfer({ timestamp: BEFORE_ACCEPT(10) });
    const onward = transfer({ from: RECEIVER, to: THIRD });
    expect(matchLegs([leg()], [early, onward]).get(1)).toMatchObject({
      kind: "verified",
      transferId: early.id,
    });
  });

  test("sold before the accept and never back breaks the leg, though the accept missed it", () => {
    // the indexer lagged the accept, so the accept still saw the objekt with the giver
    const sold = transfer({ to: THIRD, timestamp: BEFORE_ACCEPT(6) });
    expect(matchLegs([leg()], [sold]).get(1)).toEqual({
      kind: "broken",
      transferId: sold.id,
      at: sold.timestamp,
    });
    const resold = transfer({ from: THIRD, to: "0xfourth", timestamp: BEFORE_ACCEPT(7) });
    expect(matchLegs([leg()], [sold, resold]).get(1)).toEqual({
      kind: "broken",
      transferId: sold.id,
      at: sold.timestamp,
    });
  });

  test("the same move after the accept breaks the leg", () => {
    const sold = transfer({ to: THIRD });
    expect(matchLegs([leg()], [sold]).get(1)).toEqual({
      kind: "broken",
      transferId: sold.id,
      at: sold.timestamp,
    });
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

  test("counts copies from 10 minutes before the accept", () => {
    const early = transfer({ objektId: "7", timestamp: minutesBeforeAccept(11) });
    expect(matchLegs([anyCopy(1)], [early]).get(1)).toEqual({ kind: "pending" });
    const justBefore = transfer({ objektId: "8", timestamp: minutesBeforeAccept(9) });
    expect(matchLegs([anyCopy(1)], [early, justBefore]).get(1)).toMatchObject({
      kind: "verified",
      transferId: justBefore.id,
    });
  });

  test("the trade accepted first takes a copy both could use", () => {
    const later = leg({ id: 1, objektId: null, acceptedAt: "2026-10-01T13:00:00.000Z" });
    const first = leg({ id: 2, objektId: null });
    const t = transfer({ objektId: "9" });
    const results = matchLegs([later, first], [t]);
    expect(results.get(2)).toMatchObject({ kind: "verified", transferId: t.id });
    expect(results.get(1)).toEqual({ kind: "pending" });
  });

  test("records the transfer's token, not the leg's", () => {
    const t = transfer({ objektId: null, tokenId: "42" });
    expect(matchLegs([anyCopy(1)], [t]).get(1)).toMatchObject({ objektId: "42" });
  });
});

describe("matchLegs: used transfers", () => {
  test("a transfer already used by another leg is skipped", () => {
    const t = transfer({ objektId: "5" });
    const anyCopy = leg({ objektId: null });
    const used = new Set([transferKey(t)]);
    expect(matchLegs([anyCopy], [t], used).get(1)).toEqual({ kind: "pending" });
    const specific = leg({ objektId: "5" });
    expect(matchLegs([specific], [t], used).get(1)).toEqual({ kind: "pending" });
  });

  test("still used after a re-index gives the transfer a new id", () => {
    const t = transfer({ objektId: "6" });
    const reindexed = { ...t, id: "019d0000-0000-7000-8000-000000000000" };
    expect(
      matchLegs([leg({ objektId: null })], [reindexed], new Set([transferKey(t)])).get(1),
    ).toEqual({
      kind: "pending",
    });
  });
});

describe("nearMisses", () => {
  const misses = (legs: MatchLeg[], transfers: MatchTransfer[]) =>
    nearMisses(legs, transfers, matchAll(legs, transfers));

  test("a different copy from giver to receiver is reported", () => {
    const wrong = transfer({ objektId: "1207" });
    expect(misses([leg()], [wrong])).toEqual([
      { legId: 1, txHash: wrong.hash, objektId: "1207", at: wrong.timestamp },
    ]);
  });

  test("the leg's own token is not", () => {
    expect(misses([leg()], [transfer()])).toEqual([]);
  });

  test("nor is a transfer that verified another leg", () => {
    const t = transfer({ objektId: "1207" });
    expect(misses([leg({ id: 1 }), leg({ id: 2, objektId: "1207" })], [t])).toEqual([]);
    expect(misses([leg({ id: 1 }), leg({ id: 2, objektId: null })], [t])).toEqual([]);
  });

  test("nor a move before 10 minutes ahead of the accept", () => {
    expect(
      misses([leg()], [transfer({ objektId: "1207", timestamp: minutesBeforeAccept(11) })]),
    ).toEqual([]);
  });

  test("nor a move between the giver's own addresses", () => {
    expect(misses([leg()], [transfer({ objektId: "1207", to: GIVER_2 })])).toEqual([]);
  });

  test("a copy sent before the break is reported, so the break fails the trade", () => {
    const wrong = transfer({ objektId: "1207", timestamp: "2026-10-02T00:01:00.000Z" });
    const sold = transfer({ to: THIRD, timestamp: "2026-10-02T00:02:00.000Z" });
    expect(matchLegs([leg()], [wrong, sold]).get(1)?.kind).toBe("broken");
    expect(misses([leg()], [wrong, sold])).toEqual([
      { legId: 1, txHash: wrong.hash, objektId: "1207", at: wrong.timestamp },
    ]);
  });

  test("nor a copy sent after the objekt left", () => {
    const sold = transfer({ to: THIRD, timestamp: "2026-10-02T00:01:00.000Z" });
    const wrong = transfer({ objektId: "1207", timestamp: "2026-10-02T00:02:00.000Z" });
    expect(misses([leg()], [sold, wrong])).toEqual([]);
  });

  test("an any-copy leg reports none", () => {
    const pending = {
      results: new Map([[1, { kind: "pending" } as const]]),
      taken: new Set<string>(),
    };
    expect(
      nearMisses([leg({ objektId: null })], [transfer({ objektId: "1207" })], pending),
    ).toEqual([]);
  });
});

describe("tradeOutcome", () => {
  const v: LegResult = { kind: "verified", transferId: "t", txHash: "h", objektId: "1", at: START };
  const b: LegResult = { kind: "broken", transferId: "t", at: START };
  const p: LegResult = { kind: "pending" };

  test("completes when every open leg verifies", () => {
    expect(tradeOutcome([v, v], 0, 0)).toEqual({ status: "completed" });
    expect(tradeOutcome([v], 1, 0)).toEqual({ status: "completed" });
  });

  test("stays in progress while a leg waits", () => {
    expect(tradeOutcome([v, p], 0, 0)).toEqual({ status: "in_progress" });
  });

  test("a break before any verified leg cancels; after one, fails", () => {
    expect(tradeOutcome([b, p], 0, 0)).toEqual({ status: "cancelled", reason: "token_moved" });
    expect(tradeOutcome([b], 1, 0)).toEqual({ status: "failed" });
    expect(tradeOutcome([b, v], 0, 0)).toEqual({ status: "failed" });
  });

  test("a break while the receiver holds a wrong copy fails", () => {
    expect(tradeOutcome([b, p], 0, 1)).toEqual({ status: "failed" });
  });

  const s: LegResult = { kind: "stuck" };

  test("a stuck leg before anything was sent cancels", () => {
    expect(tradeOutcome([s, p], 0, 0)).toEqual({
      status: "cancelled",
      reason: "not_transferable",
    });
  });

  test("a stuck leg after something was sent waits", () => {
    expect(tradeOutcome([s], 1, 0)).toEqual({ status: "in_progress" });
    expect(tradeOutcome([s, v], 0, 0)).toEqual({ status: "in_progress" });
    expect(tradeOutcome([s, p], 0, 1)).toEqual({ status: "in_progress" });
  });

  test("a break outranks a stuck leg", () => {
    expect(tradeOutcome([b, s], 0, 0)).toEqual({ status: "cancelled", reason: "token_moved" });
    expect(tradeOutcome([b, s], 1, 0)).toEqual({ status: "failed" });
  });
});

describe("stuckChange", () => {
  test("marks a non-transferable objekt once", () => {
    expect(stuckChange(false, null)).toBe("stuck");
    expect(stuckChange(false, START)).toBeNull();
  });

  test("clears once it reads transferable again", () => {
    expect(stuckChange(true, START)).toBe("clear");
    expect(stuckChange(true, null)).toBeNull();
  });

  test("an objekt the indexer doesn't know changes nothing", () => {
    expect(stuckChange(undefined, null)).toBeNull();
    expect(stuckChange(undefined, START)).toBeNull();
  });
});

describe("expiredOutcome", () => {
  test("fails once a leg verified, else cancels", () => {
    expect(expiredOutcome(0, 0)).toBe("cancelled");
    expect(expiredOutcome(1, 0)).toBe("failed");
  });

  test("a held wrong copy fails it too", () => {
    expect(expiredOutcome(0, 1)).toBe("failed");
  });
});

describe("copyDue", () => {
  const due = "2026-10-05T00:00:00.000Z";

  test("due exactly at the deadline", () => {
    expect(copyDue(due, due)).toBe(true);
    expect(copyDue(due, "2026-10-05T00:00:01.000Z")).toBe(true);
  });

  test("not before it", () => {
    expect(copyDue(due, "2026-10-04T23:59:59.000Z")).toBe(false);
  });

  test("not while the indexer's reading trails it, or with no reading or deadline", () => {
    // the clock is past the deadline, but the indexer has read only up to two hours before it
    expect(copyDue(due, "2026-10-04T22:00:00.000Z")).toBe(false);
    expect(copyDue(due, null)).toBe(false);
    expect(copyDue(null, due)).toBe(false);
  });
});

describe("copyReminderDue", () => {
  const due = "2026-10-05T00:00:00.000Z";

  test("24 hours before the deadline, once", () => {
    expect(copyReminderDue(due, "2026-10-04T00:00:00.000Z", null)).toBe(true);
    expect(copyReminderDue(due, "2026-10-04T12:00:00.000Z", null)).toBe(true);
    expect(copyReminderDue(due, "2026-10-04T12:00:00.000Z", "2026-10-04T00:00:00.000Z")).toBe(
      false,
    );
  });

  test("not earlier, and not once the copy is due", () => {
    expect(copyReminderDue(due, "2026-10-03T23:59:59.000Z", null)).toBe(false);
    expect(copyReminderDue(due, due, null)).toBe(false);
    expect(copyReminderDue(due, null, null)).toBe(false);
  });
});

describe("copyRescue", () => {
  const copy = (id: number, at: string, status = "pending") => ({ id, at, status });
  const broken: LegResult = { kind: "broken", transferId: "t9", at: "2026-10-03T00:00:00.000Z" };

  test("a broken leg is rescued by a pending copy sent before the break", () => {
    const sent = copy(1, "2026-10-02T00:00:00.000Z");
    expect(copyRescue(broken, [sent])).toBe(sent);
  });

  test("not by a declined copy", () => {
    expect(copyRescue(broken, [copy(1, "2026-10-02T00:00:00.000Z", "declined")])).toBeNull();
  });

  test("not by a copy sent after the break", () => {
    expect(copyRescue(broken, [copy(1, "2026-10-03T00:00:01.000Z")])).toBeNull();
  });

  test("a leg that didn't break takes nothing", () => {
    expect(copyRescue({ kind: "pending" }, [copy(1, "2026-10-02T00:00:00.000Z")])).toBeNull();
  });

  test("the earliest pending copy wins", () => {
    const first = copy(2, "2026-10-01T00:00:00.000Z");
    const copies = [copy(1, "2026-10-02T00:00:00.000Z"), first];
    expect(copyRescue(broken, copies)).toBe(first);
    expect(firstPending(copies)).toBe(first);
    expect(firstPending([copy(3, "2026-10-01T00:00:00.000Z", "declined")])).toBeNull();
  });
});

describe("dueCopy and reminderCopy", () => {
  const copy = (id: number, at: string, acceptBy: string | null, status = "pending") => ({
    id,
    at,
    acceptBy,
    status,
    remindedAt: null as string | null,
  });
  const early = copy(1, "2026-10-01T00:00:00.000Z", "2026-10-06T00:00:00.000Z");
  const late = copy(2, "2026-10-02T00:00:00.000Z", "2026-10-05T00:00:00.000Z");

  test("the leg's deadline is its earliest sent copy's, not any copy's", () => {
    expect(dueCopy([early, late], "2026-10-05T12:00:00.000Z")).toBeNull();
    expect(dueCopy([early, late], "2026-10-06T00:00:00.000Z")).toBe(early);
  });

  test("only the earliest sent copy is reminded", () => {
    expect(reminderCopy([early, late], "2026-10-04T12:00:00.000Z")).toBeNull();
    expect(reminderCopy([early, late], "2026-10-05T00:00:00.000Z")).toBe(early);
    expect(
      reminderCopy(
        [{ ...early, remindedAt: "2026-10-05T00:00:00.000Z" }, late],
        "2026-10-05T01:00:00.000Z",
      ),
    ).toBeNull();
  });

  test("a declined earliest copy hands the leg to the next", () => {
    const declined = { ...early, status: "declined" };
    expect(dueCopy([declined, late], "2026-10-05T00:00:00.000Z")).toBe(late);
  });

  test("a copy with no deadline yet is not due", () => {
    expect(
      dueCopy([copy(3, "2026-10-01T00:00:00.000Z", null)], "2026-10-09T00:00:00.000Z"),
    ).toBeNull();
  });
});

describe("legVerifiedNoted", () => {
  test("noted when a leg verified other than by an auto-accepted copy", () => {
    expect(legVerifiedNoted(1, 0)).toBe(true);
    expect(legVerifiedNoted(2, 1)).toBe(true);
  });

  test("not when every leg verified now was auto-accepted, or none was", () => {
    expect(legVerifiedNoted(1, 1)).toBe(false);
    expect(legVerifiedNoted(0, 0)).toBe(false);
  });
});

describe("batchMatters", () => {
  const watch = {
    objekts: new Set(["16396147"]),
    collections: new Map([[COLLECTION, new Set([GIVER, GIVER_2])]]),
  };
  // the indexer publishes Subsquid entities: ids nested, and no flat objektId/collectionId
  const published = (objektId: string, collectionId: string, from = GIVER) =>
    JSON.stringify([
      {
        id: "019c219a-22c1-720c-8e65-a487b8f0399a",
        from,
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

  test("matches a watched collection sent by one of its givers, in any case", () => {
    expect(batchMatters(published("1", COLLECTION), watch)).toBe(true);
    expect(batchMatters(published("1", COLLECTION, GIVER.toUpperCase()), watch)).toBe(true);
  });

  test("matches any of a collection's givers", () => {
    expect(batchMatters(published("1", COLLECTION, GIVER_2), watch)).toBe(true);
  });

  test("ignores a watched collection sent by anyone else", () => {
    expect(batchMatters(published("1", COLLECTION, THIRD), watch)).toBe(false);
  });

  test("a watched objekt matches whoever sends it", () => {
    expect(batchMatters(published("16396147", COLLECTION, THIRD), watch)).toBe(true);
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

describe("giversOf", () => {
  test("joins the snapshot and current links, lowercased and once each", () => {
    const givers = giversOf({ from_addresses: ["0xAbC", GIVER], from_current: ["0xabc"] });
    expect([...givers].toSorted()).toEqual(["0xabc", GIVER]);
  });
});

describe("copyReads", () => {
  const OTHER = "c0ffee00-0000-0000-0000-000000000002";

  test("each read starts at its own leg's copy window", () => {
    const old = leg({ id: 1, copyWindowStart: minutesBeforeAccept(60 * 24 * 30) });
    const fresh = leg({ id: 2, collectionId: OTHER, giver: new Set([GIVER]) });
    expect(copyReads([old, fresh])).toEqual([
      { collectionId: COLLECTION, givers: [GIVER, GIVER_2], since: old.copyWindowStart },
      { collectionId: OTHER, givers: [GIVER], since: fresh.copyWindowStart },
    ]);
  });

  test("legs with the same collection and givers share the earliest window", () => {
    const later = leg({ id: 1, giver: new Set([GIVER_2, GIVER]) });
    const earlier = leg({ id: 2, copyWindowStart: minutesBeforeAccept(60) });
    expect(copyReads([later, earlier])).toEqual([
      { collectionId: COLLECTION, givers: [GIVER, GIVER_2], since: earlier.copyWindowStart },
    ]);
  });

  test("the same collection with other givers is its own read", () => {
    expect(copyReads([leg({ id: 1 }), leg({ id: 2, giver: new Set([THIRD]) })])).toHaveLength(2);
  });

  test("skips a leg with no known collection or no givers", () => {
    expect(copyReads([leg({ collectionId: null }), leg({ giver: new Set() })])).toEqual([]);
  });
});
