import { describe, expect, test } from "bun:test";

import { expiryOutcome, firstSenderInClock, nextRow, timelineRows } from "./trade-clock";
import { ACCEPTED, DAY, HOUR, copy, leg, trade, verified } from "./trade-fixture";

const NOW = new Date(ACCEPTED).getTime() + 4 * DAY;
const ENDS = new Date(ACCEPTED).getTime() + 14 * DAY;
const kinds = (t: ReturnType<typeof trade>, now = NOW) => timelineRows(t, now).map((r) => r.kind);

describe("timelineRows, in progress", () => {
  test("mid-trade: past rows done, Today, later rows ahead", () => {
    const t = trade({
      legs: [
        verified({ verifiedAt: new Date(NOW - 12 * HOUR).toISOString(), txHash: "0x4b82" }),
        leg({ fromYou: false }),
      ],
    });
    expect(kinds(t)).toEqual([
      "proposed",
      "accepted",
      "reminder",
      "sent",
      "today",
      "report",
      "ends",
      "rate",
    ]);
    const rows = timelineRows(t, NOW);
    expect(rows.map((r) => r.when)).toEqual([
      "past",
      "past",
      "past",
      "past",
      "today",
      "future",
      "future",
      "future",
    ]);
    expect(rows.find((r) => r.kind === "sent")).toMatchObject({ txHash: "0x4b82" });
    expect(rows.find((r) => r.kind === "ends")).toMatchObject({ outcome: "failed" });
  });

  test("paused expiry: past due while the indexer is behind sits before Today", () => {
    const t = trade({ indexerBehind: true, legs: [verified(), leg({ fromYou: false })] });
    const rows = timelineRows(t, ENDS + DAY);
    const ends = rows.findIndex((r) => r.kind === "ends");
    expect(rows[ends]).toMatchObject({ when: "paused" });
    expect(rows[ends + 1]).toMatchObject({ kind: "today" });
  });

  test("past due with the indexer caught up is plainly past", () => {
    const rows = timelineRows(trade(), ENDS + DAY);
    expect(rows.find((r) => r.kind === "ends")).toMatchObject({ when: "past" });
  });

  test("a different copy's arrival carries its hash", () => {
    const sent = copy({ at: new Date(NOW - HOUR).toISOString(), txHash: "0x0d3a", acceptBy: null });
    const rows = timelineRows(
      trade({ legs: [leg(), leg({ fromYou: false, substitutes: [sent] })] }),
      NOW,
    );
    expect(rows.map((r) => r.kind).slice(0, 5)).toEqual([
      "proposed",
      "accepted",
      "reminder",
      "copyArrived",
      "today",
    ]);
    expect(rows[3]).toMatchObject({ when: "past", txHash: "0x0d3a", copy: { id: sent.id } });
  });

  test("a pending copy adds its deadline row", () => {
    const l = leg({
      fromYou: false,
      substitutes: [
        copy({
          at: new Date(NOW - HOUR).toISOString(),
          acceptBy: new Date(NOW + DAY).toISOString(),
        }),
      ],
    });
    expect(kinds(trade({ legs: [leg(), l] }))).toEqual([
      "proposed",
      "accepted",
      "reminder",
      "copyArrived",
      "today",
      "copyDue",
      "report",
      "ends",
      "rate",
    ]);
  });

  test("a declined copy or a copy without acceptBy adds no row", () => {
    const l = leg({
      substitutes: [copy({ status: "declined" }), copy({ acceptBy: null })],
    });
    expect(kinds(trade({ legs: [l] }))).not.toContain("copyDue");
    expect(kinds(trade({ legs: [l] })).filter((k) => k === "copyArrived")).toHaveLength(2);
  });

  test("the rate row is last and undated", () => {
    const rows = timelineRows(trade(), NOW + 30 * DAY);
    expect(rows.at(-1)).toEqual({ kind: "rate", at: null, when: "future" });
  });

  test("rows at one instant keep their order", () => {
    const reminderAt = new Date(ACCEPTED).getTime() + 72 * HOUR;
    expect(kinds(trade(), reminderAt).slice(0, 4)).toEqual([
      "proposed",
      "accepted",
      "reminder",
      "today",
    ]);
  });
});

describe("expiryOutcome", () => {
  test("a verified leg fails it", () => {
    expect(expiryOutcome(trade({ legs: [verified(), leg({ fromYou: false })] }))).toBe("failed");
  });

  test("a pending copy on every waiting leg completes it", () => {
    expect(expiryOutcome(trade({ legs: [leg({ substitutes: [copy()] })] }))).toBe("completed");
    expect(
      expiryOutcome(trade({ legs: [verified(), leg({ fromYou: false, substitutes: [copy()] })] })),
    ).toBe("completed");
  });

  test("one transfer pending on two legs fails it", () => {
    const shared = copy();
    expect(
      expiryOutcome(
        trade({
          legs: [leg({ substitutes: [shared] }), leg({ substitutes: [{ ...shared, id: 99 }] })],
        }),
      ),
    ).toBe("failed");
  });

  test("a pending copy with another leg still waiting fails it", () => {
    expect(
      expiryOutcome(trade({ legs: [leg({ substitutes: [copy()] }), leg({ fromYou: false })] })),
    ).toBe("failed");
  });

  test("a declined copy fails it", () => {
    expect(
      expiryOutcome(trade({ legs: [leg({ substitutes: [copy({ status: "declined" })] })] })),
    ).toBe("failed");
  });

  test("nothing sent cancels it", () => {
    expect(expiryOutcome(trade())).toBe("cancelled");
    const ends = timelineRows(trade(), NOW).find((r) => r.kind === "ends");
    expect(ends).toMatchObject({ outcome: "cancelled" });
  });
});

describe("firstSenderInClock", () => {
  const first = { userId: "u", you: true, sent: true };
  test("carried in every state but your turn, when both give", () => {
    expect(
      firstSenderInClock(
        trade({ firstSender: first, legs: [verified(), leg({ fromYou: false })] }),
      ),
    ).toBe(true);
    expect(firstSenderInClock(trade({ firstSender: first }))).toBe(false);
  });

  test("not for a one-sided trade, an ended trade or no suggestion", () => {
    expect(firstSenderInClock(trade({ firstSender: first, legs: [leg({ fromYou: false })] }))).toBe(
      false,
    );
    expect(firstSenderInClock(trade({ status: "completed", firstSender: first }))).toBe(false);
    expect(firstSenderInClock(trade({ legs: [verified(), leg({ fromYou: false })] }))).toBe(false);
  });
});

describe("timelineRows, ended", () => {
  const sent = (at: string, fromYou: boolean, txHash: string) =>
    verified({ verifiedAt: at, fromYou, txHash });

  test("completed: proposed, accepted, each transfer by time with its hash, completed", () => {
    const rows = timelineRows(
      trade({
        status: "completed",
        endedAt: "2026-10-14T00:00:00.000Z",
        legs: [
          sent("2026-10-13T00:00:00.000Z", false, "0x2ab7"),
          sent("2026-10-12T00:00:00.000Z", true, "0x342d"),
        ],
      }),
      NOW,
    );
    expect(rows.map((r) => r.kind)).toEqual(["proposed", "accepted", "sent", "sent", "end"]);
    expect(rows[2]).toMatchObject({ at: "2026-10-12T00:00:00.000Z", txHash: "0x342d" });
    expect(rows[3]).toMatchObject({ txHash: "0x2ab7" });
    expect(rows.at(-1)).toEqual({
      kind: "end",
      at: "2026-10-14T00:00:00.000Z",
      when: "past",
      outcome: "completed",
    });
  });

  test("a rateable trade ends with when rating closes", () => {
    const t = trade({
      status: "completed",
      endedAt: "2026-10-14T00:00:00.000Z",
      legs: [verified(), verified({ fromYou: false })],
      canRate: true,
      rateUntil: "2026-10-30T00:00:00.000Z",
    });
    expect(timelineRows(t, NOW).at(-1)).toEqual({
      kind: "rateCloses",
      at: "2026-10-30T00:00:00.000Z",
      when: "future",
    });
    expect(timelineRows({ ...t, rating: "positive" }, NOW).at(-1)).toMatchObject({
      kind: "rateCloses",
    });
  });

  test("a transfer with no time sits right after the accept", () => {
    const rows = timelineRows(
      trade({
        status: "completed",
        endedAt: "2026-10-14T00:00:00.000Z",
        legs: [verified({ verifiedAt: null })],
      }),
      NOW,
    );
    expect(rows.map((r) => r.kind)).toEqual(["proposed", "accepted", "sent", "end"]);
  });

  test("a copy still pending when the trade ended adds no deadline row", () => {
    const pending = copy({ status: "pending", acceptBy: "2026-10-20T00:00:00.000Z" });
    const rows = timelineRows(
      trade({
        status: "failed",
        endedAt: "x",
        legs: [leg({ fromYou: false, substitutes: [pending] })],
      }),
      NOW,
    );
    expect(rows.map((r) => r.kind)).not.toContain("copyDue");
    expect(rows.map((r) => r.kind)).toContain("copyArrived");
  });

  test("failed and cancelled end rows, and no clock rows", () => {
    expect(
      timelineRows(trade({ status: "failed", endedAt: "x", legs: [verified(), leg()] }), NOW).at(
        -1,
      ),
    ).toMatchObject({ outcome: "failed" });
    const cancelled = timelineRows(trade({ status: "cancelled", endedAt: "y" }), NOW);
    expect(cancelled.map((r) => r.kind)).toEqual(["proposed", "accepted", "end"]);
    expect(cancelled.at(-1)).toMatchObject({ outcome: "cancelled", at: "y" });
  });
});

describe("nextRow", () => {
  test("the first row ahead, paused included", () => {
    const t = trade({ legs: [verified(), leg({ fromYou: false })] });
    expect(nextRow(timelineRows(t, NOW))).toMatchObject({ kind: "report" });
    const behind = timelineRows({ ...t, indexerBehind: true }, ENDS + DAY);
    expect(nextRow(behind)).toMatchObject({ kind: "ends", when: "paused" });
  });

  test("an ended trade with nothing ahead has none", () => {
    expect(nextRow(timelineRows(trade({ status: "cancelled", endedAt: "y" }), NOW))).toBeNull();
  });
});

describe("timelineRows, transfers by day", () => {
  // minutes apart around noon UTC, so one local day in any zone
  const at = (dayOffset: number, minute: number) =>
    new Date(new Date(ACCEPTED).getTime() + dayOffset * DAY + minute * 60_000).toISOString();
  const sentOn = (dayOffset: number, minute: number, fromYou = true) =>
    verified({ fromYou, verifiedAt: at(dayOffset, minute), txHash: `0x${dayOffset}${minute}` });

  test("a party's transfers on one day fold into one row", () => {
    const mine = Array.from({ length: 14 }, (_, i) => sentOn(1, i));
    const t = trade({ legs: [...mine, ...Array.from({ length: 4 }, () => leg())] });
    const groups = timelineRows(t, NOW).filter((r) => r.kind === "sentGroup");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ fromYou: true, total: 18, at: at(1, 13) });
    expect(groups[0]!.kind === "sentGroup" && groups[0]!.legs).toHaveLength(14);
    expect(timelineRows(t, NOW).some((r) => r.kind === "sent")).toBe(false);
  });

  test("unfolded until the client renders", () => {
    const t = trade({ legs: [sentOn(1, 0), sentOn(1, 5), leg({ fromYou: false })] });
    const rows = timelineRows(t, NOW, { fold: false });
    expect(rows.filter((r) => r.kind === "sent")).toHaveLength(2);
    expect(rows.some((r) => r.kind === "sentGroup")).toBe(false);
  });

  test("a single transfer stays its own row with its hash", () => {
    const t = trade({ legs: [sentOn(1, 0), leg({ fromYou: false })] });
    const rows = timelineRows(t, NOW);
    expect(rows.filter((r) => r.kind === "sent")).toHaveLength(1);
    expect(rows.some((r) => r.kind === "sentGroup")).toBe(false);
  });

  test("the two parties never share a group, and days stay apart", () => {
    const t = trade({
      legs: [sentOn(1, 0), sentOn(1, 5), sentOn(1, 2, false), sentOn(1, 3, false), sentOn(2, 0)],
    });
    const rows = timelineRows(t, NOW).filter((r) => r.kind === "sentGroup" || r.kind === "sent");
    expect(rows.map((r) => [r.kind, r.kind === "sentGroup" ? r.fromYou : r.leg.fromYou])).toEqual([
      ["sentGroup", false],
      ["sentGroup", true],
      ["sent", true],
    ]);
  });
});
