import { describe, expect, test } from "bun:test";

import { pinnedByConfirmed } from "./confirmed-pins";

const candidate = { id: "1000", slug: "a-1", start: 1000, end: 1099 };

describe("pinnedByConfirmed", () => {
  test("a confirmed token inside the batch pins it", () => {
    expect(pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: "1050" }])).toEqual(["1000"]);
  });

  test("a confirmed token of another slug does not", () => {
    expect(pinnedByConfirmed([candidate], [{ slug: "b-1", tokenId: "1050" }])).toEqual([]);
  });

  test("a confirmed token outside the range does not", () => {
    expect(pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: "1100" }])).toEqual([]);
    expect(pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: 999 }])).toEqual([]);
  });

  test("both range edges count", () => {
    expect(pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: "1000" }])).toEqual(["1000"]);
    expect(pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: 1099 }])).toEqual(["1000"]);
  });

  test("every candidate of a pinned batch is returned", () => {
    const other = { ...candidate, id: "1001" };
    expect(pinnedByConfirmed([candidate, other], [{ slug: "a-1", tokenId: "1050" }])).toEqual([
      "1000",
      "1001",
    ]);
  });

  test("empty inputs give nothing", () => {
    expect(pinnedByConfirmed([], [{ slug: "a-1", tokenId: "1" }])).toEqual([]);
    expect(pinnedByConfirmed([candidate], [])).toEqual([]);
  });
});
