import { describe, expect, test } from "bun:test";

import type { LegResult, SettledTrade } from "@repo/api/lib/trade-match";

import { awayNotes, awayPlan, stuckPlan } from "./leg-marks";

const settled: SettledTrade = { tradeId: 7, offerId: 3, conversationId: 9, userA: "a", userB: "b" };
const name = (userId: string) => ({ userId, name: `name-${userId}` });

describe("stuckPlan", () => {
  const waiting = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  const reading: Record<number, boolean | undefined> = {
    1: false,
    2: false,
    3: true,
    4: true,
  };
  const state = [
    { id: 1, untransferableAt: null },
    { id: 2, untransferableAt: "2026-11-01 10:00:00+00" },
    { id: 3, untransferableAt: "2026-11-01 10:00:00+00" },
    { id: 4, untransferableAt: null },
  ];

  test("marks a non-transferable unmarked leg and clears a marked one that is transferable again", () => {
    expect(stuckPlan(waiting, state, (leg) => reading[leg.id])).toEqual({
      mark: [1],
      clear: [3],
    });
  });

  test("an unknown reading changes nothing", () => {
    expect(stuckPlan(waiting, state, () => undefined)).toEqual({ mark: [], clear: [] });
  });
});

describe("awayPlan", () => {
  const leg = (id: number, giver = "a", objekt: string | null = `o${id}`) => ({
    id,
    from_user_id: giver,
    objekt_id: objekt,
  });
  const away = (since: string): LegResult => ({ kind: "pending", awaySince: since });

  test("names the earliest move first and marks every away leg", () => {
    const results = new Map<number, LegResult>([
      [1, away("2026-11-01T12:00:00.000Z")],
      [2, away("2026-11-01T10:00:00.000Z")],
    ]);
    const plan = awayPlan(
      [leg(1), leg(2, "b")],
      [
        { id: 1, awayAt: null },
        { id: 2, awayAt: null },
      ],
      results,
    );
    expect(plan.mark.map((m) => m.legId)).toEqual([1, 2]);
    expect(plan.first).toEqual({
      legId: 2,
      since: "2026-11-01T10:00:00.000Z",
      giverId: "b",
      objektId: "o2",
    });
    expect(plan.clear).toEqual([]);
  });

  test("equal moves keep the waiting order", () => {
    const results = new Map<number, LegResult>([
      [1, away("2026-11-01T10:00:00.000Z")],
      [2, away("2026-11-01 10:00:00+00")],
    ]);
    const plan = awayPlan(
      [leg(2), leg(1)],
      [
        { id: 1, awayAt: null },
        { id: 2, awayAt: null },
      ],
      results,
    );
    expect(plan.first?.legId).toBe(2);
  });

  test("a stuck leg with away_at is cleared", () => {
    const plan = awayPlan(
      [leg(1)],
      [{ id: 1, awayAt: "2026-11-01 10:00:00+00" }],
      new Map<number, LegResult>([[1, { kind: "stuck" }]]),
    );
    expect(plan).toEqual({ mark: [], clear: [1], first: null });
  });

  test("an objekt back clears alone, with nothing to note", () => {
    const plan = awayPlan(
      [leg(1)],
      [{ id: 1, awayAt: "2026-11-01 10:00:00+00" }],
      new Map<number, LegResult>([[1, { kind: "pending" }]]),
    );
    expect(plan.clear).toEqual([1]);
    expect(plan.first).toBeNull();
  });

  test("a move already recorded in DB format is not marked again", () => {
    const plan = awayPlan(
      [leg(1)],
      [{ id: 1, awayAt: "2026-11-01 10:00:00+00" }],
      new Map<number, LegResult>([[1, away("2026-11-01T10:00:00.000Z")]]),
    );
    expect(plan).toEqual({ mark: [], clear: [], first: null });
  });
});

describe("awayNotes", () => {
  const first = {
    legId: 2,
    since: "2026-11-01T10:00:00.000Z",
    giverId: "b",
    objektId: "o2",
  };

  test("breaksAt is the move plus 72 hours, byYou only for the giver", () => {
    const notes = awayNotes(
      settled,
      first,
      { serial: 5, estimated: false },
      { verified: 0, total: 2 },
      name,
    );
    expect(notes.map((n) => n.userId)).toEqual(["a", "b"]);
    expect(notes[0]!.payload).toMatchObject({
      event: "away",
      breaksAt: "2026-11-04T10:00:00.000Z",
      away: { asked: { serial: 5, estimated: false }, byYou: false },
      partner: { userId: "b", name: "name-b" },
    });
    expect(notes[1]!.payload).toMatchObject({
      away: { byYou: true },
      partner: { userId: "a", name: "name-a" },
    });
  });
});
