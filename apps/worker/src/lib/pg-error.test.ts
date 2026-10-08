import { describe, expect, test } from "bun:test";

import { isUniqueViolation } from "./pg-error";

describe("isUniqueViolation", () => {
  test("finds the code anywhere on the cause chain", () => {
    const inner = Object.assign(new Error("dup"), { code: "23505" });
    expect(isUniqueViolation(new Error("wrapped", { cause: inner }))).toBe(true);
  });

  test("rejects other errors and non-errors", () => {
    expect(isUniqueViolation(new Error("x"))).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
  });
});
