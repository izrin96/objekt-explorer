import { describe, expect, test } from "bun:test";

import { isSerialEstimated, shownSerial, V1_CUTOFF_MS } from "./serial";

describe("isSerialEstimated", () => {
  test("before the cutoff is Cosmo's serial", () => {
    expect(isSerialEstimated(new Date(V1_CUTOFF_MS - 1))).toBe(false);
  });

  test("at and after the cutoff is estimated", () => {
    expect(isSerialEstimated(new Date(V1_CUTOFF_MS))).toBe(true);
    expect(isSerialEstimated("2026-09-01T00:00:00Z")).toBe(true);
  });
});

describe("shownSerial", () => {
  test("0 is not numbered yet", () => {
    expect(shownSerial(0)).toBeNull();
    expect(shownSerial(537)).toBe(537);
  });
});
