import { describe, expect, test } from "bun:test";

import { mergeSortedTransfers } from "./transfer-merge";

const row = (id: string, timestamp: string) => ({ transfer: { id, timestamp } });
const ids = (rows: ReturnType<typeof row>[]) => rows.map((r) => r.transfer.id);

describe("mergeSortedTransfers", () => {
  test("desc merges newest first and breaks timestamp ties by higher id", () => {
    const a = [row("c", "2025-03-01"), row("a", "2025-01-01")];
    const b = [row("d", "2025-03-01"), row("b", "2025-02-01")];
    expect(ids(mergeSortedTransfers(a, b, 10, "desc"))).toEqual(["d", "c", "b", "a"]);
  });

  test("asc merges oldest first and breaks timestamp ties by lower id", () => {
    const a = [row("a", "2025-01-01"), row("c", "2025-03-01")];
    const b = [row("b", "2025-02-01"), row("d", "2025-03-01")];
    expect(ids(mergeSortedTransfers(a, b, 10, "asc"))).toEqual(["a", "b", "c", "d"]);
  });

  test("a row present in both inputs appears once", () => {
    const shared = row("x", "2025-02-01");
    const a = [row("a", "2025-01-01"), shared];
    const b = [shared, row("z", "2025-03-01")];
    expect(ids(mergeSortedTransfers(a, b, 10, "asc"))).toEqual(["a", "x", "z"]);
    expect(ids(mergeSortedTransfers([...a].reverse(), [...b].reverse(), 10, "desc"))).toEqual([
      "z",
      "x",
      "a",
    ]);
  });

  test("stops at the limit", () => {
    const a = [row("a", "2025-01-01"), row("c", "2025-03-01")];
    const b = [row("b", "2025-02-01")];
    expect(ids(mergeSortedTransfers(a, b, 2, "asc"))).toEqual(["a", "b"]);
  });

  test("one empty side returns the other", () => {
    const a = [row("a", "2025-01-01")];
    expect(ids(mergeSortedTransfers(a, [], 5, "desc"))).toEqual(["a"]);
    expect(ids(mergeSortedTransfers([], a, 5, "asc"))).toEqual(["a"]);
  });
});
