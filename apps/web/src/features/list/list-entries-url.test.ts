import { describe, expect, test } from "bun:test";

import { listEntriesUrl } from "./list-entries-url";

describe("listEntriesUrl", () => {
  test("no artist leaves no query string", () => {
    expect(listEntriesUrl("Z1qlA0_rR", [])).toBe("/api/v1/lists/Z1qlA0_rR/entries");
  });

  test("repeats artist in the order given", () => {
    expect(listEntriesUrl("abc", ["tripleS", "artms"])).toBe(
      "/api/v1/lists/abc/entries?artist=tripleS&artist=artms",
    );
  });
});
