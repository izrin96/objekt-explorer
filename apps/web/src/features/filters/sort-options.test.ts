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
  test("lists every sort both ways, its usual direction first", () => {
    const menu = sortMenu(["date", "member", "duplicate"], { sort: "date", dir: "desc" });
    expect(menu.map(sortOptionValue)).toEqual([
      "date:desc",
      "date:asc",
      "member:asc",
      "member:desc",
      "duplicate:desc",
      "duplicate:asc",
    ]);
  });

  test("a sort the surface does not offer leads the list", () => {
    const menu = sortMenu(["date"], { sort: "serial", dir: "desc" });
    expect(menu.map(sortOptionValue)).toEqual(["serial:desc", "date:desc", "date:asc"]);
  });
});

test("a menu value round-trips", () => {
  expect(parseSortOptionValue(sortOptionValue({ sort: "collectionNo", dir: "desc" }))).toEqual({
    sort: "collectionNo",
    dir: "desc",
  });
});
