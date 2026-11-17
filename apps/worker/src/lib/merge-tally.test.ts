import { describe, expect, test } from "bun:test";

import { type Anchor, COSMO_ANCHOR_NOTE } from "./cosmo-anchors";
import { mergeTally, tallyDetails, tallyWarning, withConfirmed } from "./merge-tally";
import { anchorGaps, computeOfflineSerials, computeOfflineSerialUpdates } from "./serial-math";

const PRE = "2026-01-01T00:00:00Z";
const POST = "2026-07-01T00:00:00Z";
const OBSERVED = "2026-11-17T00:00:00.000Z";

const row = (id: number, serial = 0, mintedAt = POST) => ({ id: String(id), serial, mintedAt });
const confirmed = (tokenId: number, objektNo: number) => ({
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
  { start: 3000, end: 3099 },
];
const rows = [
  row(1000, 1, PRE),
  row(1050, 51, PRE),
  row(2000, 101),
  row(2010, 111),
  row(3000, 201),
  row(3020, 221),
];
const manual = [manualAt(3000, 205)];

describe("withConfirmed", () => {
  test("returns the manual array itself when nothing is confirmed (the switch off)", () => {
    for (const none of [undefined, []]) {
      const merge = withConfirmed(manual, none, rows, batches);
      expect(merge.anchors).toBe(manual);
      expect(merge.conflicts).toEqual([]);
      expect(merge.refused).toEqual([]);
    }
  });

  test("with the switch off every serial computation matches the manual anchors alone", () => {
    const { anchors } = withConfirmed(manual, undefined, rows, batches);
    expect(computeOfflineSerialUpdates(rows, batches, anchors)).toEqual(
      computeOfflineSerialUpdates(rows, batches, manual),
    );
    expect(computeOfflineSerials(rows, batches, Date.parse(POST), anchors)).toEqual(
      computeOfflineSerials(rows, batches, Date.parse(POST), manual),
    );
    expect(anchorGaps(rows, batches, anchors)).toEqual(anchorGaps(rows, batches, manual));
  });

  test("a confirmed serial pins an unpinned batch like a manual anchor", () => {
    const merge = withConfirmed(manual, [confirmed(2010, 112)], rows, batches);
    expect(merge.anchors).toEqual([
      ...manual,
      { tokenId: 2010, serial: 112, note: COSMO_ANCHOR_NOTE, addedAt: OBSERVED },
    ]);
    const asManual = [...manual, manualAt(2010, 112)];
    expect(computeOfflineSerialUpdates(rows, batches, merge.anchors)).toEqual(
      computeOfflineSerialUpdates(rows, batches, asManual),
    );
    expect(computeOfflineSerialUpdates(rows, batches, merge.anchors)).toContainEqual({
      id: "2000",
      newSerial: 102,
    });
  });

  test("manual anchors and v1 serials win", () => {
    const merge = withConfirmed(manual, [confirmed(3020, 300), confirmed(1050, 60)], rows, batches);
    expect(merge.anchors).toBe(manual);
    expect(merge.conflicts.map((c) => c.tokenId)).toEqual([1050, 3020]);
  });
});

describe("mergeTally", () => {
  const conflict = { tokenId: 3020, objektNo: 300, pinnedSerial: 225 };
  const refusal = { tokenId: 9000, objektNo: 5, reason: "outside every stored batch" };

  test("an empty run warns nothing", () => {
    const tally = mergeTally();
    tally.record("a", { conflicts: [], refused: [] });
    expect(tallyWarning(tally)).toBeNull();
    expect(tallyDetails(tally)).toEqual([]);
  });

  test("a later merge of one collection replaces the earlier", () => {
    const tally = mergeTally();
    tally.record("a", { conflicts: [], refused: [refusal] });
    tally.record("a", { conflicts: [conflict], refused: [] });
    tally.record("b", { conflicts: [], refused: [refusal] });
    tally.record("b", { conflicts: [], refused: [] });
    expect(tally.conflicts()).toEqual([conflict]);
    expect(tally.refused()).toEqual([]);
    expect(tallyWarning(tally)).toBe(
      "confirmed serials: 1 disagree with a manual anchor or v1 serial (tokens 3020)",
    );
  });

  test("counts both kinds and lists conflicting tokens in order, capped", () => {
    const tally = mergeTally();
    tally.record("a", {
      conflicts: Array.from({ length: 22 }, (_, i) => ({ ...conflict, tokenId: 100 - i })),
      refused: [refusal],
    });
    const line = tallyWarning(tally)!;
    expect(line).toStartWith("confirmed serials: 22 disagree with a manual anchor or v1 serial");
    expect(line).toContain("(tokens 79, 80,");
    expect(line).toContain("98 +2 more); 1 refused");
    expect(tallyDetails(tally)).toHaveLength(23);
  });
});
