import { describe, expect, test } from "bun:test";

import { ownedCopiesUrl } from "./owned-copies-url";

const ADDRESS = "0xAbC0000000000000000000000000000000000001";

describe("ownedCopiesUrl", () => {
  test("no filters leaves no query string", () => {
    expect(ownedCopiesUrl(ADDRESS)).toBe(`/api/v1/objekts/owned-copies/${ADDRESS}`);
    expect(ownedCopiesUrl(ADDRESS, { artist: [] })).toBe(`/api/v1/objekts/owned-copies/${ADDRESS}`);
  });

  test("repeats artist and keeps the checkpoint", () => {
    expect(ownedCopiesUrl(ADDRESS, { artist: ["artms", "tripleS"], at: "2026-01-01" })).toBe(
      `/api/v1/objekts/owned-copies/${ADDRESS}?artist=artms&artist=tripleS&at=2026-01-01`,
    );
  });
});
