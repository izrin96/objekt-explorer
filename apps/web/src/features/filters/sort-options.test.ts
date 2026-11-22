import { describe, expect, test } from "bun:test";

import { currentSortOption, parseSortOptionValue, sortMenu, sortOptionValue } from "./sort-options";

describe("currentSortOption", () => {
  test("falls back to the surface's first sort in its usual direction", () => {
    expect(currentSortOption(["listedAt", "floor"], undefined, undefined)).toEqual({
      sort: "listedAt",
      dir: "desc",
    });
  });

  test("a sort without a direction reads its default one", () => {
    expect(currentSortOption(["date"], "rare", undefined)).toEqual({ sort: "rare", dir: "asc" });
  });

  test("keeps the URL's direction", () => {
    expect(currentSortOption(["date"], "date", "asc")).toEqual({ sort: "date", dir: "asc" });
  });
});

describe("sortMenu", () => {
  test("lists both directions only where both are offered, default first", () => {
    const menu = sortMenu(["date", "member", "price"], { sort: "date", dir: "desc" });
    expect(menu.map(sortOptionValue)).toEqual([
      "date:desc",
      "date:asc",
      "member:asc",
      "price:asc",
      "price:desc",
    ]);
  });

  test("a direction the menu does not offer leads the list", () => {
    const menu = sortMenu(["date", "member"], { sort: "member", dir: "desc" });
    expect(menu.map(sortOptionValue)).toEqual([
      "member:desc",
      "date:desc",
      "date:asc",
      "member:asc",
    ]);
  });

  test("a sort the surface does not offer leads the list", () => {
    const menu = sortMenu(["date"], { sort: "serial", dir: "asc" });
    expect(menu.map(sortOptionValue)).toEqual(["serial:asc", "date:desc", "date:asc"]);
  });
});

test("a menu value round-trips", () => {
  expect(parseSortOptionValue(sortOptionValue({ sort: "collectionNo", dir: "desc" }))).toEqual({
    sort: "collectionNo",
    dir: "desc",
  });
});
