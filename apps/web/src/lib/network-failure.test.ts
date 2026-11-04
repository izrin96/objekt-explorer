import { describe, expect, test } from "bun:test";

import { isNetworkFailure } from "./network-failure";

describe("isNetworkFailure", () => {
  test.each([
    "Failed to fetch",
    "Load failed",
    "NetworkError when attempting to fetch resource.",
    "Failed to fetch (objekt.top)",
    "Load failed (objekt.top)",
  ])("a TypeError %p is a network failure", (message) => {
    expect(isNetworkFailure(new TypeError(message))).toBe(true);
  });

  test.each([
    "Failed to fetch dynamically imported module: https://objekt.top/a.js",
    "Failed to fetch (objekt.top) extra",
    "Cannot read properties of undefined (reading 'x')",
  ])("a TypeError %p is not", (message) => {
    expect(isNetworkFailure(new TypeError(message))).toBe(false);
  });

  test("a plain Error with the same message is not", () => {
    expect(isNetworkFailure(new Error("Failed to fetch"))).toBe(false);
  });

  test("a FetchError without a response whose cause dropped is", () => {
    const error = new Error("fetch failed", {
      cause: new TypeError("Failed to fetch (objekt.top)"),
    });
    error.name = "FetchError";
    expect(isNetworkFailure(error)).toBe(true);
  });

  test("a FetchError with a response is not", () => {
    const error = Object.assign(
      new Error("fetch failed", { cause: new TypeError("Failed to fetch") }),
      {
        name: "FetchError",
        response: {},
      },
    );
    expect(isNetworkFailure(error)).toBe(false);
  });

  test("a body cut off mid-read is", () => {
    const error = new Error("Cannot parse response body", {
      cause: new TypeError("Failed to fetch (objekt.top)"),
    });
    expect(isNetworkFailure(error)).toBe(true);
  });
});
