import { describe, expect, test } from "bun:test";

import { findPgError } from "./pg-error";

const pg = (code: string, constraint?: string) =>
  Object.assign(new Error("db"), { code, constraint });

describe("findPgError", () => {
  test("finds the driver's error under a wrapper", () => {
    const inner = pg("23505", "trade_leg_reserved");
    const wrapped = new Error("Failed query", { cause: inner });
    expect(findPgError(wrapped, (e) => e.code === "23505")).toBe(inner);
  });

  test("returns the first match along the chain", () => {
    const deadlock = pg("40P01");
    const outer = Object.assign(new Error("outer", { cause: deadlock }), { code: "23505" });
    expect(findPgError(outer, (e) => e.code === "40P01" || e.code === "23505")).toBe(outer);
  });

  test("returns null for no match or a non-error", () => {
    expect(findPgError(pg("23503"), (e) => e.code === "23505")).toBeNull();
    expect(findPgError("23505", () => true)).toBeNull();
    expect(findPgError(undefined, () => true)).toBeNull();
  });
});
