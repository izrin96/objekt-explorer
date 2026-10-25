import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";

import { setErrorSink } from "../../lib/log";
import { runSkips } from "./run-skips";

const fail = () => Promise.reject(new Error("boom"));

describe("runSkips", () => {
  const errors: unknown[][] = [];
  setErrorSink((_, args) => errors.push(args));
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  spyOn(console, "error").mockImplementation(() => {});
  afterAll(() => setErrorSink(null));
  afterEach(() => {
    errors.length = 0;
    warn.mockClear();
  });

  test("a step that throws is skipped and remembered; one that passes returns its value", async () => {
    const skips = runSkips();
    expect(await skips.step(1, fail)).toBeNull();
    expect(await skips.step(2, () => Promise.resolve("ok"))).toBe("ok");
    expect(skips.has(1)).toBe(true);
    expect(skips.has(2)).toBe(false);
  });

  test("warns once a run, and reports a trade as an error on its third failing run only", async () => {
    for (let run = 1; run <= 4; run++) {
      const skips = runSkips();
      await skips.step(10, fail);
      await skips.step(11, fail);
      skips.report();
      expect(warn).toHaveBeenCalledTimes(run);
      expect(errors.length).toBe(run >= 3 ? 2 : 0);
    }
  });

  test("a trade that passes again starts its count over", async () => {
    for (const passes of [false, false, true, false, false]) {
      const skips = runSkips();
      await skips.step(20, passes ? () => Promise.resolve(null) : fail);
      skips.report();
    }
    expect(errors.length).toBe(0);
  });

  test("a run with no skips logs nothing", () => {
    runSkips().report();
    expect(warn).not.toHaveBeenCalled();
  });
});
