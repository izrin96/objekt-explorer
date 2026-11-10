import { describe, expect, test } from "bun:test";

import { check } from "@/test/check";

import { trade } from "./trade-fixture";
import { tradeMenuItems } from "./trade-menu-items";

const keys = (t: ReturnType<typeof trade>) => tradeMenuItems(t, true).map((item) => item.key);

describe("tradeMenuItems", () => {
  test("an in-progress trade with nothing verified offers Report and Cancel", () => {
    const items = tradeMenuItems(trade(), true);
    expect(items.map((item) => item.key)).toEqual(["report", "cancel"]);
    check(items[1]?.reason).toBe(null);
  });

  test("Report is disabled with its date until it opens, and blank before hydration", () => {
    const t = trade({ canReport: false });
    check(tradeMenuItems(t, true)[0]?.reason).toMatch(/^Opens on /);
    check(tradeMenuItems(t, false)[0]?.reason).toBe("");
    check(tradeMenuItems(trade({ canReport: true }), true)[0]?.reason).toBe(null);
  });

  test("a locked cancel gives its reason and offers Ask to cancel", () => {
    const t = trade({ canCancel: false, cancelLocked: true });
    expect(keys(t)).toEqual(["report", "cancel", "askCancel"]);
    check(tradeMenuItems(t, true)[1]?.reason).toBe(
      "Cancelling is locked after the first verified transfer",
    );
    // no opening time: the ask is available
    check(tradeMenuItems(t, true)[2]?.reason).toBe(null);
  });

  test("a cancel that can't run for no named reason is disabled with a blank reason", () => {
    const t = trade({ canCancel: false, cancelLocked: false, indexerBehind: false });
    check(tradeMenuItems(t, true)[1]?.reason).toBe("");
  });

  test("an open cancel request leaves Ask to cancel to the status card", () => {
    const t = trade({ canCancel: false, cancelLocked: true });
    const asked = { ...t, cancelRequest: {} as NonNullable<typeof t.cancelRequest> };
    expect(keys(asked)).toEqual(["report", "cancel"]);
  });

  test("an ended trade offers only Report for a failed one that can be reported", () => {
    expect(keys(trade({ status: "completed" }))).toEqual([]);
    expect(keys(trade({ status: "failed", canReport: true }))).toEqual(["report"]);
    expect(keys(trade({ status: "failed", canReport: false }))).toEqual([]);
  });
});
