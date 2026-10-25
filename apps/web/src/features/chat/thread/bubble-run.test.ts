import { describe, expect, test } from "bun:test";

import { GROUP_MS, runPosition } from "./bubble-run";

const at = (seconds: number, mine = false) => ({
  mine,
  createdAt: new Date(seconds * 1000).toISOString(),
});

describe("runPosition", () => {
  test("a lone message is single", () => {
    expect(runPosition(undefined, at(0), undefined)).toBe("single");
  });

  test("a run of three is first, middle, last", () => {
    const [a, b, c] = [at(0), at(30), at(60)];
    expect(runPosition(undefined, a, b)).toBe("first");
    expect(runPosition(a, b, c)).toBe("middle");
    expect(runPosition(b, c, undefined)).toBe("last");
  });

  test("a sender switch ends the run", () => {
    const [a, b, c] = [at(0), at(30, true), at(60)];
    expect(runPosition(undefined, a, b)).toBe("single");
    expect(runPosition(a, b, c)).toBe("single");
    expect(runPosition(b, c, undefined)).toBe("single");
  });

  test("a gap over GROUP_MS ends the run, and exactly GROUP_MS keeps it", () => {
    const first = at(0);
    const kept = at(GROUP_MS / 1000);
    const split = at(GROUP_MS / 1000 + 1);
    expect(runPosition(undefined, first, kept)).toBe("first");
    expect(runPosition(undefined, first, split)).toBe("single");
    expect(runPosition(first, split, undefined)).toBe("single");
  });
});
