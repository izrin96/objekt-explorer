import { describe, expect, test } from "bun:test";

import { type Anchor, COSMO_ANCHOR_NOTE, mergeAnchors } from "./cosmo-anchors";

const PRE = "2026-01-01T00:00:00Z";
const POST = "2026-07-01T00:00:00Z";
const OBSERVED = "2026-11-17T00:00:00.000Z";

const row = (id: number, serial = 0, mintedAt = POST) => ({ id: String(id), serial, mintedAt });
const confirmed = (tokenId: number | string, objektNo: number) => ({
  tokenId,
  objektNo,
  observedAt: OBSERVED,
});
const manualAt = (tokenId: number, serial: number): Anchor => ({
  tokenId,
  serial,
  note: "reported",
  addedAt: "2026-11-01T00:00:00.000Z",
});

const batches = [
  { start: 1000, end: 1099 },
  { start: 2000, end: 2099 },
];
const rows = [row(1000), row(1010), row(1050), row(1060), row(2000), row(2010), row(2050)];

const merge = (c: ReturnType<typeof confirmed>[], manual: Anchor[] = [], r = rows) =>
  mergeAnchors({ manual, confirmed: c, rows: r, batches });

describe("mergeAnchors", () => {
  test("keeps a confirmed serial of an unpinned batch as an anchor", () => {
    const { anchors, conflicts, refused } = merge([confirmed("1010", 30)]);
    expect(anchors).toEqual([
      { tokenId: 1010, serial: 30, note: COSMO_ANCHOR_NOTE, addedAt: OBSERVED },
    ]);
    expect(conflicts).toEqual([]);
    expect(refused).toEqual([]);
  });

  test("keeps two confirmed serials in one unpinned batch, in token order", () => {
    const { anchors } = merge([confirmed(1060, 61), confirmed(1010, 11)]);
    expect(anchors.map((a) => [a.tokenId, a.serial])).toEqual([
      [1010, 11],
      [1060, 61],
    ]);
  });

  test("keeps a serial the batch's estimate already gives", () => {
    // the first batch starts at serial 1, so token 1010 is estimated 11
    const { anchors, conflicts } = merge([confirmed(1010, 11)]);
    expect(anchors).toHaveLength(1);
    expect(conflicts).toEqual([]);
  });

  test("drops a confirmed serial equal to a manual anchor on the same token", () => {
    const manual = [manualAt(1010, 30)];
    const result = merge([confirmed(1010, 30)], manual);
    expect(result.anchors).toEqual(manual);
    expect(result.conflicts).toEqual([]);
  });

  test("a confirmed serial against another manual serial on the token is a conflict", () => {
    const manual = [manualAt(1010, 30)];
    const result = merge([confirmed(1010, 31)], manual);
    expect(result.anchors).toEqual(manual);
    expect(result.conflicts).toEqual([{ tokenId: 1010, objektNo: 31, pinnedSerial: 30 }]);
  });

  test("a batch pinned by a manual anchor: an agreeing serial is dropped without a conflict", () => {
    const manual = [manualAt(1010, 30)];
    // token 1050 follows as 70
    const result = merge([confirmed(1050, 70)], manual);
    expect(result.anchors).toEqual(manual);
    expect(result.conflicts).toEqual([]);
    expect(result.refused).toEqual([]);
  });

  test("a batch pinned by a manual anchor: a disagreeing serial is a conflict", () => {
    const manual = [manualAt(1010, 30)];
    const result = merge([confirmed(1050, 71)], manual);
    expect(result.anchors).toEqual(manual);
    expect(result.conflicts).toEqual([{ tokenId: 1050, objektNo: 71, pinnedSerial: 70 }]);
  });

  test("a batch pinned by a v1 serial: agreeing is dropped, disagreeing is a conflict", () => {
    const v1Rows = [...rows, row(2005, 100, PRE)];
    // token 2050 follows as 145
    const agree = merge([confirmed(2050, 145)], [], v1Rows);
    expect(agree.anchors).toEqual([]);
    expect(agree.conflicts).toEqual([]);
    const differ = merge([confirmed(2050, 146)], [], v1Rows);
    expect(differ.anchors).toEqual([]);
    expect(differ.conflicts).toEqual([{ tokenId: 2050, objektNo: 146, pinnedSerial: 145 }]);
  });

  test("only batches no manual or v1 serial pins take confirmed anchors", () => {
    const manual = [manualAt(1010, 30)];
    const { anchors } = merge([confirmed(1050, 70), confirmed(2010, 15)], manual);
    expect(anchors.map((a) => a.tokenId)).toEqual([1010, 2010]);
  });

  test("refuses a serial that would push a neighbour below 1", () => {
    // token 1000 would get 20 - 50 = -30
    const { anchors, refused } = merge([confirmed(1050, 20)]);
    expect(anchors).toEqual([]);
    expect(refused).toHaveLength(1);
    expect(refused[0]?.tokenId).toBe(1050);
    expect(refused[0]?.reason).toContain("below 1");
  });

  test("refuses a token outside every stored batch", () => {
    const { anchors, refused } = merge([confirmed(5000, 9)], [], [...rows, row(5000)]);
    expect(anchors).toEqual([]);
    expect(refused).toEqual([{ tokenId: 5000, objektNo: 9, reason: "outside every stored batch" }]);
  });

  test("refuses a token missing from the collection's rows", () => {
    const { refused } = merge([confirmed(1070, 9)]);
    expect(refused).toHaveLength(1);
    expect(refused[0]?.reason).toContain("not found");
  });

  test("judges a later confirmed serial against the ones kept before it", () => {
    // 1010 -> 30 makes 1000 serial 20; then 1060 -> 3 would put 1050 at -3 and is refused
    const { anchors, refused } = merge([confirmed(1010, 30), confirmed(1060, 3)]);
    expect(anchors.map((a) => a.tokenId)).toEqual([1010]);
    expect(refused.map((r) => r.tokenId)).toEqual([1060]);
  });

  test("returns every manual anchor unchanged ahead of the kept ones", () => {
    const manual = [manualAt(2010, 40), manualAt(2050, 80)];
    const { anchors } = merge([confirmed(1010, 11)], manual);
    expect(anchors.slice(0, 2)).toEqual(manual);
    expect(anchors[2]).toEqual({
      tokenId: 1010,
      serial: 11,
      note: COSMO_ANCHOR_NOTE,
      addedAt: OBSERVED,
    });
  });

  test("an empty confirmed list returns manual as is", () => {
    const manual = [manualAt(1010, 30)];
    const result = merge([], manual);
    expect(result.anchors).toBe(manual);
    expect(result.conflicts).toEqual([]);
    expect(result.refused).toEqual([]);
  });

  test("uses the confirming read's time and a note that names no account", () => {
    const { anchors } = merge([
      { tokenId: "1010", objektNo: 30, observedAt: "2026-11-10T00:00:00.000Z" },
    ]);
    expect(anchors[0]?.addedAt).toBe("2026-11-10T00:00:00.000Z");
    expect(COSMO_ANCHOR_NOTE).toBe("Cosmo objektNo from a connected account");
  });
});
