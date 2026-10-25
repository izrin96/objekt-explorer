import { describe, expect, test } from "bun:test";

import { errorReport, heartbeat, levelFrom, summarize } from "./log";

describe("levelFrom", () => {
  test("takes a known level", () => {
    expect(levelFrom("debug")).toBe("debug");
    expect(levelFrom("warn")).toBe("warn");
  });

  test("falls back to info when unset or unknown", () => {
    expect(levelFrom(undefined)).toBe("info");
    expect(levelFrom("verbose")).toBe("info");
    expect(levelFrom("toString")).toBe("info");
  });
});

describe("summarize", () => {
  test("lists counts in the order they were first counted", () => {
    expect(
      summarize(
        new Map([
          ["runs", 30],
          ["verified", 0],
        ]),
      ),
    ).toBe("runs 30, verified 0");
  });
});

describe("heartbeat", () => {
  const recorder = () => {
    const lines: string[] = [];
    return { lines, logger: { info: (line: unknown) => void lines.push(String(line)) } };
  };

  test("stays quiet until the hour is up, then logs once and starts over", () => {
    const { lines, logger } = recorder();
    const beat = heartbeat(logger);
    // after the heartbeat starts, so an hour from here is at least an hour from its start
    const start = Date.now();
    beat.count("runs");
    beat.count("events", 120);
    beat.max("slowest (ms)", 80);
    beat.max("slowest (ms)", 40);
    beat.flush(start + 59 * 60_000);
    expect(lines).toEqual([]);
    beat.count("runs");
    beat.flush(start + 60 * 60_000);
    expect(lines).toEqual(["last 60 min: runs 2, events 120, slowest (ms) 80"]);
    beat.flush(start + 61 * 60_000);
    expect(lines).toHaveLength(1);
  });
});

describe("errorReport", () => {
  test("takes the first error and the text parts", () => {
    const error = new Error("boom");
    expect(errorReport(["Batch", 2, "failed:", error, { address: "0x1" }])).toEqual({
      error,
      message: "Batch 2 failed:",
    });
  });

  test("has no error for a text-only line", () => {
    expect(errorReport(["refresh token is expired"])).toEqual({
      error: undefined,
      message: "refresh token is expired",
    });
  });
});
