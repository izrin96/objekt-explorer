import { describe, expect, test } from "bun:test";

import { nextModifiedAt } from "./collection-bump";

describe("nextModifiedAt", () => {
  const now = Date.parse("2026-11-04T10:00:00.500Z");

  test("with nothing stored, the list changed now", () => {
    expect(nextModifiedAt(now, null)).toBe(now);
  });

  test("a bump long after the last one is now", () => {
    expect(nextModifiedAt(now, "2026-11-04T09:00:00.000Z")).toBe(now);
  });

  test("a bump in the same second as the last one lands a second after it", () => {
    const previous = "2026-11-04T10:00:00.200Z";
    const next = nextModifiedAt(now, previous);
    expect(next).toBe(Date.parse(previous) + 1000);
    expect(Math.floor(next / 1000)).toBeGreaterThan(Math.floor(Date.parse(previous) / 1000));
  });

  test("a stored time ahead of the clock still moves forward", () => {
    expect(nextModifiedAt(now, "2026-11-04T10:00:05.000Z")).toBe(
      Date.parse("2026-11-04T10:00:06.000Z"),
    );
  });

  test("an unreadable stored value counts as nothing stored", () => {
    expect(nextModifiedAt(now, "not a date")).toBe(now);
  });
});
