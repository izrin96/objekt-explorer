import { describe, expect, test } from "bun:test";

import { OVERRIDE_COPY_MS, copyServes, overrideReadPlan } from "./collection-override-copy";

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

describe("overrideReadPlan", () => {
  const startedAt = 1_000_000;

  test("with no copy yet, the caller waits for the first read", () => {
    expect(overrideReadPlan(undefined, startedAt)).toBe("wait");
    expect(overrideReadPlan(undefined, startedAt, startedAt - 1)).toBe("wait");
  });

  test("a copy under a minute old is served as is", () => {
    expect(overrideReadPlan(startedAt, startedAt + OVERRIDE_COPY_MS - 1)).toBe("serve");
  });

  test("a copy a minute old is served at once while a refresh starts", () => {
    expect(overrideReadPlan(startedAt, startedAt + OVERRIDE_COPY_MS)).toBe("serve-and-refresh");
    expect(overrideReadPlan(startedAt, startedAt + 10 * OVERRIDE_COPY_MS)).toBe(
      "serve-and-refresh",
    );
  });

  test("a caller asking for a copy read after a bump is served one that is", () => {
    expect(overrideReadPlan(startedAt, startedAt + 10, startedAt - 1)).toBe("serve");
  });

  test("a caller asking for a copy read after a bump waits when the copy is older", () => {
    expect(overrideReadPlan(startedAt, startedAt + 10, startedAt)).toBe("wait");
  });

  test("a caller asking for freshness waits rather than take a copy a minute old", () => {
    expect(overrideReadPlan(startedAt, startedAt + OVERRIDE_COPY_MS, startedAt - 1)).toBe("wait");
  });
});
