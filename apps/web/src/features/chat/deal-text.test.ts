import { describe, expect, test } from "bun:test";

import type { Deal, DealState } from "@repo/api/schemas/chat-deal";

import { dealNo, dealTone, rowText, stripText } from "./deal-text";

const offer = (state: "waitingYou" | "waitingThem"): Deal => ({
  kind: "offer",
  id: 261,
  state,
  count: null,
  verified: null,
  total: null,
  until: new Date(Date.now() + 3 * 86_400_000 + 3_600_000).toISOString(),
});

const trade = (state: DealState, over: Partial<Deal> = {}): Deal => ({
  kind: "trade",
  id: 89,
  state,
  count: null,
  verified: 3,
  total: 6,
  until: null,
  ...over,
});

const row = (deal: Deal) => {
  const { words, trailing } = rowText(deal);
  return [dealNo(deal), words, trailing].filter(Boolean).join(" · ");
};

describe("row line, as the spec's Wording by state table", () => {
  test.each<[string, Deal, string]>([
    ["offer to you", offer("waitingYou"), "O-261 · Waiting for you"],
    ["offer from you", offer("waitingThem"), "O-261 · Waiting for them"],
    ["you decide", trade("youDecide"), "T-89 · Different copy to decide"],
    ["your turn", trade("yourTurn", { count: 4 }), "T-89 · Your turn · send 4"],
    ["their turn", trade("theirTurn"), "T-89 · Waiting for them · 3 of 6"],
    ["stuck", trade("stuck"), "T-89 · Can't be sent · 3 of 6"],
    ["they decide", trade("theyDecide"), "T-89 · Waiting for them to decide"],
    ["completed", trade("completed"), "T-89 · Completed · rate them"],
    ["failed", trade("failed"), "T-89 · Failed · rate them"],
  ])("%s", (_, deal, line) => {
    expect(row(deal)).toBe(line);
  });
});

test("tones, as the spec's Tone by state table", () => {
  expect(
    Object.fromEntries(
      (
        [
          "waitingYou",
          "waitingThem",
          "youDecide",
          "yourTurn",
          "theirTurn",
          "stuck",
          "theyDecide",
          "completed",
          "failed",
        ] as const
      ).map((state) => [state, dealTone(state)]),
    ),
  ).toEqual({
    waitingYou: "warning",
    waitingThem: "neutral",
    youDecide: "warning",
    yourTurn: "progress",
    theirTurn: "progress",
    stuck: "warning",
    theyDecide: "warning",
    completed: "success",
    failed: "warning",
  });
});

describe("strip, as the spec's Strip by state table", () => {
  const strip = (deal: Deal | null, hadOffer = true) => {
    const text = stripText(deal, hadOffer, "haneul_07", {
      left: () => "3 days",
      date: () => "Oct 30",
    });
    return {
      line: [text.no, text.words, text.trailing].filter(Boolean).join(" · "),
      second: text.second,
      action: text.action,
    };
  };

  test("offer to you", () => {
    expect(strip(offer("waitingYou"))).toEqual({
      line: "O-261 · Waiting for you",
      second: "haneul_07 sent an offer. It expires in 3 days.",
      action: "review",
    });
  });

  test("offer from you", () => {
    expect(strip(offer("waitingThem"))).toEqual({
      line: "O-261 · Waiting for them",
      second: "It expires in 3 days.",
      action: "view",
    });
  });

  test.each<[DealState, string, string | null]>([
    ["youDecide", "T-89 · In progress · you decide · 3 of 6", null],
    [
      "theirTurn",
      "T-89 · In progress · their turn · 3 of 6",
      "Waiting on haneul_07 to send their part",
    ],
    ["stuck", "T-89 · In progress · can't send · 3 of 6", null],
    ["theyDecide", "T-89 · In progress · they decide · 3 of 6", null],
  ])("%s", (state, line, second) => {
    expect(strip(trade(state))).toEqual({ line, second, action: "openTrade" });
  });

  test("your turn, several and one", () => {
    expect(strip(trade("yourTurn", { count: 4, verified: 2, total: 8 }))).toEqual({
      line: "T-89 · In progress · your turn · 2 of 8",
      second: "Send 4 objekts to haneul_07 in Cosmo",
      action: "openTrade",
    });
    expect(strip(trade("yourTurn", { count: 1 })).second).toBe(
      "Send 1 objekt to haneul_07 in Cosmo",
    );
  });

  test("to rate", () => {
    const until = "2026-10-30T12:00:00.000Z";
    const completed = strip(trade("completed", { verified: null, total: null, until }));
    expect(completed.line).toBe("T-89 · Completed");
    expect(completed.second).toBe("Rate haneul_07 by Oct 30");
    expect(completed.action).toBe("rate");
    expect(strip(trade("failed", { verified: null, total: null, until })).line).toBe(
      "T-89 · Failed",
    );
  });

  test("no deal", () => {
    expect(strip(null, false)).toEqual({
      line: "No offer between you yet",
      second: null,
      action: "makeOffer",
    });
    expect(strip(null, true).line).toBe("No open offer");
  });
});
