import { describe, expect, test } from "bun:test";

import { staffTimeline, type TimelineTrade } from "./staff-timeline";

const A = "user-a";
const B = "user-b";

const leg = (
  id: number,
  from: string,
  over: Partial<TimelineTrade["legs"][number]> = {},
): TimelineTrade["legs"][number] => ({
  id,
  fromUserId: from,
  toUserId: from === A ? B : A,
  verifiedAt: null,
  confirmedAt: null,
  awayAt: null,
  untransferableAt: null,
  ...over,
});

const base = (over: Partial<TimelineTrade> = {}): TimelineTrade => ({
  userA: A,
  userB: B,
  proposedAt: "2026-10-01T09:00:00.000Z",
  acceptedAt: "2026-10-01T10:00:00.000Z",
  status: "in_progress",
  endedAt: null,
  cancelReason: null,
  cancelledBy: null,
  legs: [],
  copies: [],
  cancelRequests: [],
  ...over,
});

const kinds = (trade: TimelineTrade) => staffTimeline(trade).map((row) => row.kind);

describe("staffTimeline", () => {
  test("a completed trade reads proposed, accepted, each leg, completed, in time order", () => {
    const trade = base({
      status: "completed",
      endedAt: "2026-10-02T12:00:00.000Z",
      legs: [
        leg(2, B, { verifiedAt: "2026-10-02T12:00:00.000Z" }),
        leg(1, A, { verifiedAt: "2026-10-01T15:00:00.000Z" }),
      ],
    });
    const rows = staffTimeline(trade);
    expect(rows.map((r) => r.kind)).toEqual([
      "proposed",
      "accepted",
      "leg_verified",
      "leg_verified",
      "completed",
    ]);
    expect(rows[2]).toMatchObject({ legId: 1, userId: A });
    expect(rows[3]).toMatchObject({ legId: 2, userId: B });
    const times = rows.map((r) => Date.parse(r.at));
    expect(times).toEqual(times.toSorted((x, y) => x - y));
  });

  test("a failed trade with a broken leg ends failed with no reason", () => {
    const trade = base({
      status: "failed",
      endedAt: "2026-10-05T00:00:00.000Z",
      legs: [leg(1, A, { verifiedAt: "2026-10-02T00:00:00.000Z" }), leg(2, B)],
    });
    const rows = staffTimeline(trade);
    expect(rows.at(-1)).toMatchObject({ kind: "failed", reason: null });
    expect(rows.filter((r) => r.kind === "leg_verified")).toHaveLength(1);
  });

  test("a failed trade at its expiry ends failed with the expired reason", () => {
    const trade = base({
      status: "failed",
      endedAt: "2026-10-15T10:00:00.000Z",
      cancelReason: "expired",
      legs: [leg(1, A, { verifiedAt: "2026-10-02T00:00:00.000Z" }), leg(2, B)],
    });
    expect(staffTimeline(trade).at(-1)).toMatchObject({ kind: "failed", reason: "expired" });
  });

  test("a leg the receiver confirmed by hand reads confirmed, by the receiver", () => {
    const trade = base({
      legs: [
        leg(1, A, {
          verifiedAt: "2026-10-02T00:00:00.000Z",
          confirmedAt: "2026-10-02T00:00:00.000Z",
        }),
      ],
    });
    const rows = staffTimeline(trade);
    expect(rows.map((r) => r.kind)).toEqual(["proposed", "accepted", "leg_confirmed"]);
    expect(rows[2]).toMatchObject({ legId: 1, userId: B });
  });

  test("a wrong copy accepted at its deadline reads sent, then accepted automatically", () => {
    const trade = base({
      legs: [leg(1, A, { verifiedAt: "2026-10-05T10:00:00.000Z" })],
      copies: [
        {
          legId: 1,
          transferredAt: "2026-10-02T10:00:00.000Z",
          status: "accepted",
          decidedAt: "2026-10-05T10:00:00.000Z",
          autoAccepted: true,
        },
      ],
    });
    const rows = staffTimeline(trade);
    expect(rows.map((r) => r.kind)).toEqual([
      "proposed",
      "accepted",
      "copy_sent",
      "copy_accepted",
      "leg_verified",
    ]);
    expect(rows[2]).toMatchObject({ userId: A, legId: 1 });
    expect(rows[3]).toMatchObject({ auto: true, userId: null });
  });

  test("a declined request to cancel reads asked by one party, declined by the other", () => {
    const trade = base({
      cancelRequests: [
        {
          askedBy: A,
          askedAt: "2026-10-03T00:00:00.000Z",
          status: "declined",
          answeredAt: "2026-10-03T05:00:00.000Z",
        },
      ],
    });
    const rows = staffTimeline(trade);
    expect(rows.slice(2)).toMatchObject([
      { kind: "cancel_asked", userId: A },
      { kind: "cancel_declined", userId: B },
    ]);
  });

  test("a request the trade outlived lapses when the trade ends, after the ending", () => {
    const trade = base({
      status: "completed",
      endedAt: "2026-10-04T00:00:00.000Z",
      legs: [leg(1, A, { verifiedAt: "2026-10-04T00:00:00.000Z" })],
      cancelRequests: [
        { askedBy: B, askedAt: "2026-10-03T00:00:00.000Z", status: "pending", answeredAt: null },
      ],
    });
    expect(kinds(trade)).toEqual([
      "proposed",
      "accepted",
      "cancel_asked",
      "leg_verified",
      "completed",
      "cancel_lapsed",
    ]);
  });

  test("a pending request on a running trade is only asked", () => {
    const trade = base({
      cancelRequests: [
        { askedBy: B, askedAt: "2026-10-03T00:00:00.000Z", status: "pending", answeredAt: null },
      ],
    });
    expect(kinds(trade)).toEqual(["proposed", "accepted", "cancel_asked"]);
  });

  test("a cancelled trade names who cancelled and why", () => {
    const trade = base({
      status: "cancelled",
      endedAt: "2026-10-02T00:00:00.000Z",
      cancelReason: "party",
      cancelledBy: B,
    });
    expect(staffTimeline(trade).at(-1)).toMatchObject({
      kind: "cancelled",
      userId: B,
      reason: "party",
    });
  });

  test("an away or stuck leg is dated when it was marked", () => {
    const trade = base({
      legs: [
        leg(1, A, { awayAt: "2026-10-02T00:00:00.000Z" }),
        leg(2, B, { untransferableAt: "2026-10-03T00:00:00.000Z" }),
      ],
    });
    expect(staffTimeline(trade).slice(2)).toMatchObject([
      { kind: "leg_away", legId: 1, userId: A },
      { kind: "leg_stuck", legId: 2, userId: B },
    ]);
  });

  test("no row carries anything but its time, kind, actor, leg, auto flag and reason", () => {
    const trade = base({
      status: "completed",
      endedAt: "2026-10-02T00:00:00.000Z",
      legs: [leg(1, A, { verifiedAt: "2026-10-02T00:00:00.000Z" })],
    });
    for (const row of staffTimeline(trade)) {
      expect(Object.keys(row).toSorted()).toEqual(
        ["at", "auto", "kind", "legId", "reason", "userId"].toSorted(),
      );
    }
  });

  test("database timestamps come out as ISO times", () => {
    const trade = base({ proposedAt: "2026-10-01 09:00:00+00" });
    expect(staffTimeline(trade)[0]!.at).toBe("2026-10-01T09:00:00.000Z");
  });
});
