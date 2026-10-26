import { describe, expect, test } from "bun:test";

import { type SentItem, sentChanges } from "./offer-sent";

const item = (overrides: Partial<SentItem> = {}): SentItem => ({
  itemId: 10,
  offerId: 1,
  marked: false,
  objektId: "87",
  holders: ["0xgiver"],
  receivers: ["0xreceiver"],
  since: "2026-10-26T00:00:00.000Z",
  ...overrides,
});
const send = {
  objektId: "87",
  from: "0xgiver",
  to: "0xreceiver",
  timestamp: "2026-10-26 01:06:00+00",
};
const atReceiver = new Map([["87", "0xreceiver"]]);
const atGiver = new Map([["87", "0xgiver"]]);

describe("sentChanges", () => {
  test("marks a new early send with its time", () => {
    expect(sentChanges([item()], atReceiver, [send], new Set())).toEqual({
      mark: [{ itemId: 10, offerId: 1, at: send.timestamp }],
      clear: [],
    });
  });

  test("leaves a marked send that still holds", () => {
    expect(sentChanges([item({ marked: true })], atReceiver, [send], new Set())).toEqual({
      mark: [],
      clear: [],
    });
  });

  test("clears the mark once the objekt is back with its giver", () => {
    expect(sentChanges([item({ marked: true })], atGiver, [send], new Set())).toEqual({
      mark: [],
      clear: [{ itemId: 10, offerId: 1 }],
    });
  });

  test("never marks still with the giver", () => {
    expect(sentChanges([item()], atGiver, [], new Set())).toEqual({ mark: [], clear: [] });
  });

  test("skips offers this run cancels", () => {
    expect(sentChanges([item()], atReceiver, [send], new Set([1]))).toEqual({
      mark: [],
      clear: [],
    });
    expect(sentChanges([item({ marked: true })], atGiver, [], new Set([1]))).toEqual({
      mark: [],
      clear: [],
    });
  });
});
