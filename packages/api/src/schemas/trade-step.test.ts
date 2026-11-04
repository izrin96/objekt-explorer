import { expect, test } from "bun:test";

import { type TradeCounts, type TradeStep, tradeStep } from "./trade-step";

const none: TradeCounts = { owed: 0, sendable: 0, stuck: 0, toDecide: 0, cancelAsk: null };

const cases: [string, Partial<TradeCounts>, TradeStep][] = [
  [
    "their request to cancel outranks everything",
    { cancelAsk: "them", toDecide: 1, owed: 4, sendable: 4 },
    "theyAskCancel",
  ],
  [
    "your request to cancel outranks a different copy and your turn",
    { cancelAsk: "you", toDecide: 1, owed: 4, sendable: 4 },
    "youAskCancel",
  ],
  ["a different copy to decide on", { toDecide: 1 }, "youDecide"],
  ["deciding outranks sending", { toDecide: 1, owed: 4, sendable: 4 }, "youDecide"],
  ["something to send", { owed: 1, sendable: 1 }, "yourTurn"],
  [
    "a sendable leg beside a stuck one is still your turn",
    { owed: 2, sendable: 1, stuck: 1 },
    "yourTurn",
  ],
  ["nothing owed", {}, "theirTurn"],
  ["only stuck legs owed", { owed: 1, stuck: 1 }, "stuck"],
  ["stuck outranks waiting on their decision", { owed: 2, stuck: 1 }, "stuck"],
  ["every owed leg holds a copy they must decide on", { owed: 1 }, "theyDecide"],
];

test.each(cases)("%s", (_, counts, step) => {
  expect(tradeStep({ ...none, ...counts })).toBe(step);
});
