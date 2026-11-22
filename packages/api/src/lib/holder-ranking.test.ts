import { describe, expect, test } from "bun:test";

import { rankHolders } from "./holder-ranking";

describe("rankHolders", () => {
  test("orders by copies, ties by lowest serial, and shares tied ranks", () => {
    const { holders } = rankHolders(
      [
        { owner: "0xC", copies: 1, lowestSerial: 9 },
        { owner: "0xA", copies: 5, lowestSerial: 30 },
        { owner: "0xB", copies: 5, lowestSerial: 2 },
        { owner: "0xD", copies: 2, lowestSerial: 1 },
      ],
      new Map(),
    );
    expect(holders.map(([address, , , rank]) => [address, rank])).toEqual([
      ["0xb", 1],
      ["0xa", 1],
      ["0xd", 3],
      ["0xc", 4],
    ]);
  });

  test("carries each holder's nickname by lowercased address", () => {
    const { holders } = rankHolders(
      [
        { owner: "0xAbC", copies: 2, lowestSerial: 1 },
        { owner: "0xdef", copies: 1, lowestSerial: 4 },
      ],
      new Map([["0xabc", "kiki"]]),
    );
    expect(holders).toEqual([
      ["0xabc", 2, 1, 1, "kiki"],
      ["0xdef", 1, 4, 2, null],
    ]);
  });

  test("buckets holders and copies", () => {
    const { summary } = rankHolders(
      [
        { owner: "0x1", copies: 1, lowestSerial: 1 },
        { owner: "0x2", copies: 3, lowestSerial: 2 },
        { owner: "0x3", copies: 12, lowestSerial: 3 },
      ],
      new Map(),
    );
    expect(summary).toEqual({
      holders: 3,
      copies: 16,
      buckets: [
        { key: "1", holders: 1, copies: 1 },
        { key: "2-4", holders: 1, copies: 3 },
        { key: "5-9", holders: 0, copies: 0 },
        { key: "10+", holders: 1, copies: 12 },
      ],
    });
  });

  test("a missing lowest serial reads as 0", () => {
    const { holders } = rankHolders([{ owner: "0x1", copies: 1, lowestSerial: null }], new Map());
    expect(holders[0]?.[2]).toBe(0);
  });
});
