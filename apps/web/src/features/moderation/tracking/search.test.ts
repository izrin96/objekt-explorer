import { describe, expect, test } from "bun:test";

import { staffRangeSearchSchema } from "./search";

const daysOf = (search: Record<string, unknown>) => staffRangeSearchSchema.parse(search).days;

describe("staffRangeSearchSchema", () => {
  test("a range from the link, which arrives as a string, is kept", () => {
    expect(daysOf({ days: "7" })).toBe(7);
    expect(daysOf({ days: "90" })).toBe(90);
    expect(daysOf({ days: 30 })).toBe(30);
  });

  test("an unknown or missing range counts 30 days", () => {
    expect(daysOf({ days: "365" })).toBe(30);
    expect(daysOf({ days: "abc" })).toBe(30);
    expect(daysOf({})).toBe(30);
  });
});
