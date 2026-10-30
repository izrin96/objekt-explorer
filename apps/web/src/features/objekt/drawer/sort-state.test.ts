import { describe, expect, test } from "bun:test";

import { nextSort } from "./sort-state";

describe("nextSort", () => {
  test("the active column flips asc to desc", () => {
    expect(nextSort({ key: "serial", dir: "asc" }, "serial", "asc")).toEqual({
      key: "serial",
      dir: "desc",
    });
  });

  test("the active column flips desc to asc", () => {
    expect(nextSort({ key: "price", dir: "desc" }, "price", "desc")).toEqual({
      key: "price",
      dir: "asc",
    });
  });

  test("another column starts in its first direction", () => {
    expect(nextSort({ key: "price", dir: "asc" }, "serial", "asc")).toEqual({
      key: "serial",
      dir: "asc",
    });
    expect(nextSort({ key: "serial", dir: "asc" }, "price", "desc")).toEqual({
      key: "price",
      dir: "desc",
    });
  });
});
