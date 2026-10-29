import { describe, expect, test } from "bun:test";

import { ACTIVE_REPORT_MS, failedReportAt, REPORT_RETRY_MS, shouldReport } from "./activity";

describe("shouldReport", () => {
  const now = 1_000_000;

  test("the first activity reports", () => {
    expect(shouldReport(undefined, now)).toBe(true);
  });

  test("activity within a minute of the last report waits", () => {
    expect(shouldReport(now - 1, now)).toBe(false);
    expect(shouldReport(now - ACTIVE_REPORT_MS + 1, now)).toBe(false);
  });

  test("a minute or more after the last report reports", () => {
    expect(shouldReport(now - ACTIVE_REPORT_MS, now)).toBe(true);
    expect(shouldReport(now - ACTIVE_REPORT_MS * 30, now)).toBe(true);
  });
});

describe("failedReportAt", () => {
  const now = 1_000_000;

  test("activity soon after a failed report waits", () => {
    expect(shouldReport(failedReportAt(now), now + REPORT_RETRY_MS - 1)).toBe(false);
  });

  test("activity after the retry wait reports again, well inside a minute", () => {
    expect(shouldReport(failedReportAt(now), now + REPORT_RETRY_MS)).toBe(true);
  });
});
