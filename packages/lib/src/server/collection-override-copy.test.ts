import { describe, expect, test } from "bun:test";

import { OVERRIDE_COPY_MS, copyServes } from "./collection-override-copy";

describe("copyServes", () => {
  const startedAt = 1_000_000;

  test("a copy under a minute old serves a read with no freshness asked", () => {
    expect(copyServes(startedAt, startedAt + OVERRIDE_COPY_MS - 1)).toBe(true);
  });

  test("a copy a minute old is read again", () => {
    expect(copyServes(startedAt, startedAt + OVERRIDE_COPY_MS)).toBe(false);
  });

  test("a copy whose read started after the bump serves it", () => {
    expect(copyServes(startedAt, startedAt + 10, startedAt - 1)).toBe(true);
  });

  test("a copy whose read started at or before the bump is read again", () => {
    expect(copyServes(startedAt, startedAt + 10, startedAt)).toBe(false);
    expect(copyServes(startedAt, startedAt + 10, startedAt + 5)).toBe(false);
  });
});
