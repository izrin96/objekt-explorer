import { describe, expect, test } from "bun:test";

import { pinnedByConfirmed } from "./confirmed-pins";

const candidate = { id: "1000", slug: "a-1", start: 1000, end: 1099 };

describe("pinnedByConfirmed", () => {
  test("a confirmed token inside the batch pins it", () => {
    expect(
      pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: "1050", objektNo: 51 }]),
    ).toEqual(["1000"]);
  });

  test("a confirmed token of another slug does not", () => {
    expect(
      pinnedByConfirmed([candidate], [{ slug: "b-1", tokenId: "1050", objektNo: 51 }]),
    ).toEqual([]);
  });

  test("a confirmed token outside the range does not", () => {
    expect(
      pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: "1100", objektNo: 101 }]),
    ).toEqual([]);
    expect(pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: 999, objektNo: 0 }])).toEqual(
      [],
    );
  });

  test("both range edges count", () => {
    expect(pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: "1000", objektNo: 1 }])).toEqual(
      ["1000"],
    );
    expect(pinnedByConfirmed([candidate], [{ slug: "a-1", tokenId: 1099, objektNo: 100 }])).toEqual(
      ["1000"],
    );
  });

  test("every candidate of a pinned batch is returned", () => {
    const other = { ...candidate, id: "1001" };
    expect(
      pinnedByConfirmed([candidate, other], [{ slug: "a-1", tokenId: "1050", objektNo: 51 }]),
    ).toEqual(["1000", "1001"]);
  });

  test("confirmed tokens that agree pin the batch together", () => {
    const agree = [
      { slug: "a-1", tokenId: "1010", objektNo: 11 },
      { slug: "a-1", tokenId: "1040", objektNo: 41 },
    ];
    expect(pinnedByConfirmed([candidate], agree)).toEqual(["1000"]);
  });

  test("confirmed tokens that disagree pin nothing in their batch", () => {
    const disagree = [
      { slug: "a-1", tokenId: "1010", objektNo: 11 },
      { slug: "a-1", tokenId: "1040", objektNo: 42 },
    ];
    expect(pinnedByConfirmed([candidate], disagree)).toEqual([]);
    const elsewhere = { id: "2000", slug: "a-1", start: 2000, end: 2099 };
    const pinnedThere = [...disagree, { slug: "a-1", tokenId: "2005", objektNo: 106 }];
    expect(pinnedByConfirmed([candidate, elsewhere], pinnedThere)).toEqual(["2000"]);
  });

  test("empty inputs give nothing", () => {
    expect(pinnedByConfirmed([], [{ slug: "a-1", tokenId: "1", objektNo: -998 }])).toEqual([]);
    expect(pinnedByConfirmed([candidate], [])).toEqual([]);
  });
  test("a due token alone pins nothing, but its disagreement unpins a settled one", () => {
    const due = { slug: "a-1", tokenId: "1040", objektNo: 42, settled: false };
    expect(pinnedByConfirmed([candidate], [due])).toEqual([]);
    const settled = { slug: "a-1", tokenId: "1010", objektNo: 11, settled: true };
    expect(pinnedByConfirmed([candidate], [settled, due])).toEqual([]);
    expect(pinnedByConfirmed([candidate], [settled, { ...due, objektNo: 41 }])).toEqual(["1000"]);
  });
});
