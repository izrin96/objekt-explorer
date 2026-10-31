import { describe, expect, test } from "bun:test";

import { profileSlugBase } from "./profile-slug";

describe("profileSlugBase", () => {
  test("lowercases and drops what slugify strips", () => {
    expect(profileSlugBase("My List!")).toBe("my-list");
  });

  test("stops at 90 characters, with no dash left at the cut", () => {
    expect(profileSlugBase(`${"a".repeat(89)} ${"b".repeat(40)}`)).toBe("a".repeat(89));
    expect(profileSlugBase("c".repeat(120))).toHaveLength(90);
  });

  test("a name with nothing slugify keeps is empty", () => {
    expect(profileSlugBase("!!!")).toBe("");
  });
});
