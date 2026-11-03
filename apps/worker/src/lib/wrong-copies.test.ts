import { describe, expect, test } from "bun:test";

import type { NearMiss, SettledTrade } from "@repo/api/lib/trade-match";

import { freshMisses, noteDeadline, unrecordedMisses, wrongCopyNotes } from "./wrong-copies";

const miss = (legId: number, txHash: string, objektId: string): NearMiss => ({
  legId,
  txHash,
  objektId,
  at: "2026-11-01T10:00:00.000Z",
});

describe("unrecordedMisses", () => {
  test("drops a miss whose leg, hash and objekt are already recorded", () => {
    const misses = [miss(1, "0xa", "10")];
    expect(unrecordedMisses(misses, [{ legId: 1, txHash: "0xa", objektId: "10" }])).toEqual([]);
  });

  test("keeps the same transfer for another leg", () => {
    const misses = [miss(1, "0xa", "10"), miss(2, "0xa", "10")];
    expect(unrecordedMisses(misses, [{ legId: 1, txHash: "0xa", objektId: "10" }])).toEqual([
      miss(2, "0xa", "10"),
    ]);
  });

  test("keeps a miss when only the objekt differs", () => {
    const misses = [miss(1, "0xa", "11")];
    expect(unrecordedMisses(misses, [{ legId: 1, txHash: "0xa", objektId: "10" }])).toEqual(misses);
  });
});

describe("freshMisses", () => {
  const open = new Set([1]);

  test("drops a miss on a leg that is no longer open", () => {
    expect(freshMisses([miss(2, "0xa", "10")], open, [])).toEqual([]);
  });

  test("drops a miss whose hash and objekt verified some leg", () => {
    expect(freshMisses([miss(1, "0xa", "10")], open, [{ txHash: "0xa", objektId: "10" }])).toEqual(
      [],
    );
  });

  test("keeps a second token in the same transaction", () => {
    const misses = [miss(1, "0xa", "10"), miss(1, "0xa", "11")];
    expect(freshMisses(misses, open, [{ txHash: "0xa", objektId: "10" }])).toEqual([
      miss(1, "0xa", "11"),
    ]);
  });

  test("a spent row with no verified objekt spends nothing", () => {
    const misses = [miss(1, "0xa", "10")];
    expect(freshMisses(misses, open, [{ txHash: "0xa", objektId: null }])).toEqual(misses);
  });
});

describe("noteDeadline", () => {
  const copy = (id: number, status: string, at: string) => ({ id, status, at });
  const added = (id: number, legId: number) => ({
    id,
    legId,
    acceptBy: "2026-11-02 10:00:00+00" as string | null,
  });

  test("the leg's earliest pending copy gets its acceptBy", () => {
    const deadline = noteDeadline(
      [added(5, 1)],
      new Map([[1, [copy(5, "pending", "2026-11-01T10:00:00.000Z")]]]),
    );
    expect(deadline.get(5)).toBe("2026-11-02 10:00:00+00");
  });

  test("a later copy behind an earlier pending one gets null", () => {
    const deadline = noteDeadline(
      [added(6, 1)],
      new Map([
        [
          1,
          [
            copy(5, "pending", "2026-11-01T09:00:00.000Z"),
            copy(6, "pending", "2026-11-01T10:00:00.000Z"),
          ],
        ],
      ]),
    );
    expect(deadline.get(6)).toBeNull();
  });

  test("a declined earlier copy does not block it", () => {
    const deadline = noteDeadline(
      [added(6, 1)],
      new Map([
        [
          1,
          [
            copy(5, "declined", "2026-11-01T09:00:00.000Z"),
            copy(6, "pending", "2026-11-01T10:00:00.000Z"),
          ],
        ],
      ]),
    );
    expect(deadline.get(6)).toBe("2026-11-02 10:00:00+00");
  });

  test("the time may be in either format", () => {
    const deadline = noteDeadline(
      [added(6, 1)],
      new Map([
        [
          1,
          [
            copy(5, "pending", "2026-11-01 10:00:00+00"),
            copy(6, "pending", "2026-11-01T09:30:00.000Z"),
          ],
        ],
      ]),
    );
    expect(deadline.get(6)).toBe("2026-11-02 10:00:00+00");
    expect(deadline.get(5)).toBeUndefined();
  });
});

describe("wrongCopyNotes", () => {
  const settled: SettledTrade = {
    tradeId: 7,
    offerId: 3,
    conversationId: 9,
    userA: "a",
    userB: "b",
  };
  const name = (userId: string) => ({ userId, name: `name-${userId}` });
  const serialOf = (id: string) => ({ serial: Number(id) || null, estimated: false });

  test("each added copy gives two notes, one per party, naming the other", () => {
    const notes = wrongCopyNotes(
      settled,
      [
        { id: 5, legId: 1, objektId: "20" },
        { id: 6, legId: 2, objektId: "21" },
      ],
      new Map([
        [1, "10"],
        [2, "11"],
      ]),
      serialOf,
      new Map([
        [5, "2026-11-02 10:00:00+00"],
        [6, null],
      ]),
      { verified: 0, total: 2 },
      name,
    );
    expect(notes.map((n) => [n.userId, n.payload.partner.userId])).toEqual([
      ["a", "b"],
      ["b", "a"],
      ["a", "b"],
      ["b", "a"],
    ]);
    expect(notes[0]!.payload).toMatchObject({
      event: "wrong_copy",
      acceptBy: "2026-11-02T10:00:00.000Z",
      copy: { asked: { serial: 10 }, sent: { serial: 20 } },
      progress: { verified: 0, total: 2 },
    });
    expect("acceptBy" in notes[2]!.payload).toBe(false);
  });
});
