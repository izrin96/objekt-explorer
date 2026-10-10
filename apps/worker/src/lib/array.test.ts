import { describe, expect, test } from "bun:test";

import { chunks, unique } from "./array";

describe("unique", () => {
  test("keeps first occurrences in order", () => {
    expect(unique([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
  });
});

describe("chunks", () => {
  test("splits into runs of at most size", () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test("returns nothing for an empty list", () => {
    expect(chunks([], 3)).toEqual([]);
  });
});
