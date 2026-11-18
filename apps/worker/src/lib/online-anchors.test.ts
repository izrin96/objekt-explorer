import { describe, expect, test } from "bun:test";

import { onlineAnchors } from "./online-anchors";

const PRE = "2026-01-01T00:00:00Z";
const POST = "2026-07-01T00:00:00Z";
const AT = "2026-11-18T00:00:00Z";

const row = (id: number, mintedAt = POST) => ({ id: String(id), mintedAt });
const read = (tokenId: number, objektNo: number) => ({ tokenId, objektNo, observedAt: AT });
const rows = [row(10, PRE), row(11), row(12), row(13), row(14)];

describe("onlineAnchors", () => {
  test("keeps reads of post-cutoff tokens in token order", () => {
    expect(onlineAnchors([read(13, 30), read(11, 20)], rows, false)).toEqual({
      anchors: [
        { tokenId: "11", serial: 20 },
        { tokenId: "13", serial: 30 },
      ],
      conflicts: [],
      refused: [],
    });
  });

  test("refuses a token not among the rows", () => {
    const result = onlineAnchors([read(99, 5), read(12, 7)], rows, false);
    expect(result.anchors).toEqual([{ tokenId: "12", serial: 7 }]);
    expect(result.refused).toEqual([
      { tokenId: 99, objektNo: 5, reason: "not found in the collection" },
    ]);
  });

  test("refuses a pre-cutoff token", () => {
    expect(onlineAnchors([read(10, 5)], rows, false).refused).toHaveLength(1);
  });

  test("refuses the head serial 0", () => {
    const allPost = [row(1), row(2), row(3)];
    const result = onlineAnchors([read(1, 1), read(2, 4)], allPost, true);
    expect(result.anchors).toEqual([{ tokenId: "2", serial: 4 }]);
    expect(result.refused.map((r) => r.tokenId)).toEqual([1]);
  });

  test("a read lower than an earlier one leaves out every read as a conflict", () => {
    const result = onlineAnchors([read(11, 120), read(13, 110), read(14, 200)], rows, false);
    expect(result.anchors).toEqual([]);
    expect(result.conflicts).toEqual([
      { tokenId: 11, objektNo: 120, pinnedSerial: null },
      { tokenId: 13, objektNo: 110, pinnedSerial: null },
      { tokenId: 14, objektNo: 200, pinnedSerial: null },
    ]);
  });

  test("equal serials agree", () => {
    const result = onlineAnchors([read(11, 124), read(12, 124)], rows, false);
    expect(result.conflicts).toEqual([]);
    expect(result.anchors).toHaveLength(2);
  });
});
