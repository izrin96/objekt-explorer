import { describe, expect, test } from "bun:test";

import type { LegResult, SettledTrade } from "@repo/api/lib/trade-match";

import { autoAcceptNotes, legProgress, pickCopies, pickedResult } from "./copy-accept";

describe("pickCopies", () => {
  test("keeps leg order and skips legs with no copies or a null pick", () => {
    const copiesOf = new Map([
      [1, ["a1"]],
      [3, ["c1", "c2"]],
      [4, ["d1"]],
    ]);
    const picked = pickCopies([4, 2, 1, 3], copiesOf, (legId, copies) =>
      legId === 4 ? null : (copies[0] ?? null),
    );
    expect(picked).toEqual(["a1", "c1"]);
  });
});

describe("pickedResult", () => {
  const verified: LegResult = {
    kind: "verified",
    transferId: "",
    txHash: "0xa",
    objektId: "1",
    at: "2026-11-01T10:00:00.000Z",
  };

  test("an accepted leg is verified and the rest pending, in leg order", () => {
    const { applied } = pickedResult(
      [5, 6, 7],
      new Map([[6, verified]]),
      { verified: 1, total: 4 },
      1,
    );
    expect(applied).toEqual([{ kind: "pending" }, verified, { kind: "pending" }]);
  });

  test("counts verified and autoAccepted are the accepted count, alreadyVerified the progress before", () => {
    const { counts } = pickedResult([5, 6], new Map([[6, verified]]), { verified: 1, total: 4 }, 1);
    expect(counts).toEqual({ alreadyVerified: 1, verified: 1, total: 4, autoAccepted: 1 });
  });
});

describe("legProgress", () => {
  test("an any-copy leg's asked objekt is empty, and a confirmed leg counts as verified", () => {
    const { askedOf, progress } = legProgress([
      { id: 1, verifiedAt: null, objektId: "o1" },
      { id: 2, verifiedAt: null, objektId: null },
      { id: 3, verifiedAt: "2026-11-01 10:00:00+00", objektId: null },
    ]);
    expect(askedOf.get(1)).toBe("o1");
    expect(askedOf.get(2)).toBe("");
    expect(progress).toEqual({ verified: 1, total: 3 });
  });
});

describe("autoAcceptNotes", () => {
  const settled: SettledTrade = {
    tradeId: 7,
    offerId: 3,
    conversationId: 9,
    userA: "a",
    userB: "b",
  };
  const name = (userId: string) => ({ userId, name: `name-${userId}` });
  const serialOf = (id: string) => ({ serial: Number(id) || null, estimated: false });

  test("every note shows the progress before plus all accepted copies", () => {
    const notes = autoAcceptNotes(
      settled,
      [
        { legId: 1, objektId: "20" },
        { legId: 2, objektId: "21" },
      ],
      new Map([
        [1, "10"],
        [2, ""],
      ]),
      serialOf,
      { verified: 1, total: 4 },
      name,
    );
    expect(notes).toHaveLength(4);
    for (const note of notes) {
      expect(note.payload.progress).toEqual({ verified: 3, total: 4 });
      expect(note.payload.event).toBe("wrong_copy_auto_accepted");
    }
    expect(notes.map((n) => n.payload.partner.userId)).toEqual(["b", "a", "b", "a"]);
    expect(notes[0]!.payload.copy).toEqual({
      asked: { serial: 10, estimated: false },
      sent: { serial: 20, estimated: false },
    });
  });
});
