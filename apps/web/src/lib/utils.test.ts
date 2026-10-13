import { describe, expect, test } from "bun:test";

import { isSafeRedirect } from "./utils";

describe("isSafeRedirect", () => {
  test("accepts a same-origin path", () => {
    expect(isSafeRedirect("/trade")).toBe(true);
    expect(isSafeRedirect("/@nick/list?x=1")).toBe(true);
  });
  test("rejects off-site and protocol-relative values", () => {
    expect(isSafeRedirect("//evil.example")).toBe(false);
    expect(isSafeRedirect("/\\evil.example")).toBe(false);
    expect(isSafeRedirect("https://evil.example")).toBe(false);
    expect(isSafeRedirect("trade")).toBe(false);
  });
});
