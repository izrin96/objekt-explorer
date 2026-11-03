import { describe, expect, test } from "bun:test";

import { blockTimeOf, seenUntilOf } from "./seen-until";

const HEAD = "2026-11-01T10:00:00.000Z";
const headMs = Date.parse(HEAD);

describe("seenUntilOf", () => {
  test("no held transfer reads to the head", () => {
    expect(seenUntilOf(HEAD, null)).toBe(HEAD);
  });

  test("a transfer held 10s before the head stops one second before it", () => {
    expect(seenUntilOf(HEAD, headMs - 10_000)).toBe("2026-11-01T09:59:49.000Z");
  });

  test("a transfer held exactly 1s after the head reads to the head", () => {
    expect(seenUntilOf(HEAD, headMs + 1000)).toBe(HEAD);
  });

  test("a transfer held 999ms after the head stops 1ms before the head", () => {
    expect(seenUntilOf(HEAD, headMs + 999)).toBe("2026-11-01T09:59:59.999Z");
  });

  test("a transfer held long after the head reads to the head", () => {
    expect(seenUntilOf(HEAD, headMs + 3_600_000)).toBe(HEAD);
  });
});

describe("blockTimeOf", () => {
  test("reads a hex timestamp in seconds", () => {
    expect(blockTimeOf("0x10")).toBe("1970-01-01T00:00:16.000Z");
  });
});
