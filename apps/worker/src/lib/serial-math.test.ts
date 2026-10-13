import { describe, expect, test } from "bun:test";

import {
  checkManualAnchor,
  claimGapBlocks,
  computeOfflineSerials,
  computeOfflineSerialUpdates,
  computeOnlineSerials,
  mayHoldReservedBlocks,
  snapBatchLengths,
  V1_CUTOFF_MS,
} from "./serial-math";

const PRE = "2026-01-01T00:00:00Z";
const POST = "2026-07-01T00:00:00Z";

const objekt = (id: number | string, serial: number, mintedAt = POST) => ({
  id: String(id),
  serial,
  mintedAt,
});

describe("computeOnlineSerials", () => {
  test("numbers post-cutoff objekts by tokenId order", () => {
    const rows = [objekt(1, 0), objekt(2, 0), objekt(3, 0)];
    expect(computeOnlineSerials(rows, V1_CUTOFF_MS, false).updates).toEqual([
      { id: "1", newSerial: 1 },
      { id: "2", newSerial: 2 },
      { id: "3", newSerial: 3 },
    ]);
  });

  test("never changes a pre-cutoff serial, even out of tokenId order", () => {
    const rows = [objekt(1, 5, PRE), objekt(2, 3, PRE), objekt(3, 0)];
    expect(computeOnlineSerials(rows, V1_CUTOFF_MS, false).updates).toEqual([
      { id: "3", newSerial: 6 },
    ]);
  });

  test("continues above the highest pre-cutoff serial of a sparse collection", () => {
    const rows = [objekt(1, 1, PRE), objekt(2, 40, PRE), objekt(3, 0), objekt(4, 0)];
    expect(computeOnlineSerials(rows, V1_CUTOFF_MS, false).updates).toEqual([
      { id: "3", newSerial: 41 },
      { id: "4", newSerial: 42 },
    ]);
  });

  test("heals a late-indexed objekt into tokenId order", () => {
    const rows = [objekt(1, 1), objekt(2, 3), objekt(3, 2)];
    expect(computeOnlineSerials(rows, V1_CUTOFF_MS, false).updates).toEqual([
      { id: "2", newSerial: 2 },
      { id: "3", newSerial: 3 },
    ]);
  });

  test("keeps a head serial 0 without spending a serial on it", () => {
    const rows = [objekt(1, 0), objekt(2, 0), objekt(3, 0)];
    expect(computeOnlineSerials(rows, V1_CUTOFF_MS, true).updates).toEqual([
      { id: "2", newSerial: 1 },
      { id: "3", newSerial: 2 },
    ]);
  });

  test("reports nothing when every serial is already right", () => {
    const rows = [objekt(1, 1, PRE), objekt(2, 2), objekt(3, 3)];
    expect(computeOnlineSerials(rows, V1_CUTOFF_MS, false).updates).toEqual([]);
  });
});

describe("computeOfflineSerials", () => {
  test("lets unminted tokens inside a batch consume a serial", () => {
    const rows = [objekt(100, 0), objekt(103, 0)];
    expect(computeOfflineSerials(rows, [{ start: 100, end: 110 }], V1_CUTOFF_MS, [])).toEqual([
      { id: "100", serial: 1 },
      { id: "103", serial: 4 },
    ]);
  });

  test("chains an anchorless batch on from the end of the previous one", () => {
    const batches = [
      { start: 100, end: 199 },
      { start: 300, end: 399 },
    ];
    const rows = [objekt(150, 0), objekt(300, 0), objekt(310, 0)];
    expect(computeOfflineSerials(rows, batches, V1_CUTOFF_MS, [])).toEqual([
      { id: "150", serial: 51 },
      { id: "300", serial: 101 },
      { id: "310", serial: 111 },
    ]);
  });

  test("pins a batch to its v1 anchor when discovery misplaced its start", () => {
    // the true start is 100; discovery took two unminted tokens below for this collection's
    const rows = [objekt(105, 6, PRE), objekt(110, 0)];
    expect(computeOfflineSerials(rows, [{ start: 98, end: 120 }], V1_CUTOFF_MS, [])).toEqual([
      { id: "105", serial: 6 },
      { id: "110", serial: 11 },
    ]);
  });

  test("numbers from the nearest anchor inside a batch", () => {
    // the two anchors disagree by 5, as they would across an unseen inner gap
    const rows = [objekt(100, 1, PRE), objekt(200, 106, PRE), objekt(190, 0), objekt(110, 0)];
    const serials = computeOfflineSerials(rows, [{ start: 100, end: 250 }], V1_CUTOFF_MS, []);
    expect(serials).toContainEqual({ id: "190", serial: 96 });
    expect(serials).toContainEqual({ id: "110", serial: 11 });
  });

  test("leaves out tokens outside every batch and serials that would not be positive", () => {
    const rows = [objekt(50, 0), objekt(100, 3, PRE), objekt(101, 0), objekt(97, 0)];
    const serials = computeOfflineSerials(rows, [{ start: 97, end: 120 }], V1_CUTOFF_MS, []);
    expect(serials.map((s) => s.id)).toEqual(["100", "101"]);
  });
});

describe("computeOfflineSerials with manual anchors", () => {
  const batch = { start: 29519229, end: 29519600 };
  const serialsOf = (
    rows: ReturnType<typeof objekt>[],
    batches: (typeof batch)[],
    m = anchorList,
  ) => new Map(computeOfflineSerials(rows, batches, V1_CUTOFF_MS, m).map((c) => [c.id, c.serial]));
  const anchorList = [{ tokenId: 29519351, serial: 38 }];

  test("one report renumbers the whole batch", () => {
    const rows = [objekt(29519329, 0), objekt(29519351, 0), objekt(29519360, 0)];
    const serials = serialsOf(rows, [batch]);
    expect(serials.get("29519351")).toBe(38);
    expect(serials.get("29519329")).toBe(16);
    expect(serials.get("29519360")).toBe(47);
  });

  test("a later anchorless batch chains from the anchored one", () => {
    const batches = [
      { start: 100, end: 199 },
      { start: 300, end: 399 },
    ];
    const rows = [objekt(150, 0), objekt(300, 0)];
    const serials = serialsOf(rows, batches, [{ tokenId: 150, serial: 80 }]);
    // batch 1 starts at serial 30 and ends at 129
    expect(serials.get("150")).toBe(80);
    expect(serials.get("300")).toBe(130);
  });

  test("an earlier batch is unaffected", () => {
    const batches = [
      { start: 100, end: 199 },
      { start: 300, end: 399 },
    ];
    const rows = [objekt(150, 0), objekt(350, 0)];
    const without = serialsOf(rows, batches, []);
    const withAnchor = serialsOf(rows, batches, [{ tokenId: 350, serial: 20 }]);
    expect(withAnchor.get("150")).toBe(without.get("150"));
    expect(withAnchor.get("350")).toBe(20);
  });

  test("each objekt takes the nearer of a v1 and a manual anchor", () => {
    const rows = [objekt(100, 1, PRE), objekt(120, 0), objekt(190, 0), objekt(200, 0)];
    const serials = serialsOf(rows, [{ start: 100, end: 250 }], [{ tokenId: 200, serial: 111 }]);
    expect(serials.get("120")).toBe(21);
    expect(serials.get("190")).toBe(101);
  });

  test("a v1 serial wins over a manual anchor on the same token", () => {
    const rows = [objekt(100, 5, PRE), objekt(110, 0)];
    const serials = serialsOf(rows, [{ start: 100, end: 120 }], [{ tokenId: 100, serial: 50 }]);
    expect(serials.get("100")).toBe(5);
    expect(serials.get("110")).toBe(15);
  });

  test("ignores an anchor outside every batch", () => {
    const rows = [objekt(100, 0)];
    expect(
      serialsOf(rows, [{ start: 100, end: 120 }], [{ tokenId: 500, serial: 9 }]).get("100"),
    ).toBe(1);
  });

  test("never rewrites a pre-cutoff serial through computeOfflineSerialUpdates", () => {
    const rows = [objekt(100, 5, PRE), objekt(101, 0)];
    expect(
      computeOfflineSerialUpdates(rows, [{ start: 100, end: 120 }], [{ tokenId: 100, serial: 50 }]),
    ).toEqual([{ id: "101", newSerial: 6 }]);
  });
});

describe("checkManualAnchor", () => {
  const batches = [{ start: 1000, end: 1099 }];
  const rows = [objekt(1000, 1), objekt(1050, 51), objekt(1090, 91), objekt(900, 7, PRE)];

  test("accepts a sound anchor", () => {
    expect(checkManualAnchor(rows, batches, { tokenId: 1050, serial: 60 }, [])).toBeNull();
  });

  test("refuses a serial below 1", () => {
    expect(checkManualAnchor(rows, batches, { tokenId: 1050, serial: 0 }, [])).toContain("below 1");
  });

  test("refuses a token that is not in the collection", () => {
    expect(checkManualAnchor(rows, batches, { tokenId: 1051, serial: 5 }, [])).toContain(
      "not found",
    );
  });

  test("refuses a pre-cutoff objekt", () => {
    expect(checkManualAnchor(rows, batches, { tokenId: 900, serial: 5 }, [])).toContain(
      "v1 cutoff",
    );
  });

  test("refuses a collection without stored batches", () => {
    expect(checkManualAnchor(rows, [], { tokenId: 1050, serial: 60 }, [])).toContain(
      "no stored batches",
    );
  });

  test("refuses a token outside every batch", () => {
    expect(
      checkManualAnchor([...rows, objekt(2000, 0)], batches, { tokenId: 2000, serial: 5 }, []),
    ).toContain("outside every stored batch");
  });

  test("judges the new anchor together with the stored ones", () => {
    const stored = [{ tokenId: 1040, serial: 41 }];
    // alone, 1090 = 5 would put 1000 at -85; with 1040 stored, 1000 keeps serial 1
    expect(checkManualAnchor(rows, batches, { tokenId: 1090, serial: 5 }, stored)).toBeNull();
  });

  test("names the neighbour that would drop below 1", () => {
    expect(checkManualAnchor(rows, batches, { tokenId: 1050, serial: 5 }, [])).toBe(
      "token 1000 would get serial -45, below 1",
    );
  });
});

describe("computeOfflineSerialUpdates", () => {
  test("returns only the post-cutoff serials that change", () => {
    const rows = [objekt(100, 1, PRE), objekt(101, 2), objekt(102, 9)];
    expect(computeOfflineSerialUpdates(rows, [{ start: 100, end: 110 }], [])).toEqual([
      { id: "102", newSerial: 3 },
    ]);
  });

  test("never rewrites a pre-cutoff serial", () => {
    // a second anchor that disagrees with the first still keeps its own serial
    const rows = [objekt(100, 1, PRE), objekt(101, 7, PRE)];
    expect(computeOfflineSerialUpdates(rows, [{ start: 100, end: 110 }], [])).toEqual([]);
  });
});

describe("mayHoldReservedBlocks", () => {
  test("needs room for one block and at most the validated gap size", () => {
    expect(mayHoldReservedBlocks({ start: 1, end: 99 })).toBe(false);
    expect(mayHoldReservedBlocks({ start: 1, end: 100 })).toBe(true);
    expect(mayHoldReservedBlocks({ start: 1, end: 20000 })).toBe(true);
    expect(mayHoldReservedBlocks({ start: 1, end: 20001 })).toBe(false);
  });
});

describe("claimGapBlocks", () => {
  const none = new Set<number>();

  test("claims an untouched block", () => {
    expect(claimGapBlocks({ start: 1001, end: 1100 }, [], none)).toEqual([
      { start: 1001, end: 1100 },
    ]);
  });

  test("claims the blocks between minted separators", () => {
    expect(claimGapBlocks({ start: 1001, end: 1203 }, [1203, 1001, 1002], none)).toEqual([
      { start: 1003, end: 1202 },
    ]);
  });

  test("leaves an unminted separator at the front of a run out of the block", () => {
    expect(claimGapBlocks({ start: 1001, end: 1102 }, [1001], none)).toEqual([
      { start: 1003, end: 1102 },
    ]);
  });

  test("claims nothing when more tokens are minted than separators can explain", () => {
    const minted = [1001, 1002, 1003, 1004, 1005, 1006, 1007];
    expect(claimGapBlocks({ start: 1001, end: 1300 }, minted, none)).toEqual([]);
  });

  test("claims nothing when the gap holds one of the collection's own tokens", () => {
    expect(claimGapBlocks({ start: 1001, end: 1201 }, [1001], new Set([1001]))).toEqual([]);
  });

  test("claims nothing when the runs are not whole blocks", () => {
    expect(claimGapBlocks({ start: 1, end: 250 }, [120], none)).toEqual([]);
  });
});

describe("snapBatchLengths", () => {
  test("trims a closed batch to whole blocks that still hold its tokens", () => {
    const batches = [
      { start: 1000, end: 1149 },
      { start: 2000, end: 2010 },
    ];
    expect(snapBatchLengths(batches, [1060, 1149, 2000])).toEqual([
      { start: 1050, end: 1149 },
      { start: 2000, end: 2010 },
    ]);
  });

  test("never grows a batch past its discovered start", () => {
    const batches = [
      { start: 1000, end: 1149 },
      { start: 2000, end: 2010 },
    ];
    expect(snapBatchLengths(batches, [1010, 2000])).toEqual(batches);
  });

  test("leaves whole-block batches, empty batches and the frontier alone", () => {
    const batches = [
      { start: 1000, end: 1099 },
      { start: 1200, end: 1249 },
      { start: 2000, end: 2033 },
    ];
    expect(snapBatchLengths(batches, [1050, 2010])).toEqual(batches);
  });
});
