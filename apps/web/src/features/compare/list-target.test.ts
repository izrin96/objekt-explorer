import { describe, expect, test } from "bun:test";

import { parseListInput } from "./list-target";

describe("parseListInput", () => {
  test("a bare ID is the slug", () => {
    expect(parseListInput("  aB3dE5fG7 ")).toEqual({ slug: "aB3dE5fG7" });
  });

  test("a /list/ link gives its slug", () => {
    expect(parseListInput("https://example.com/list/aB3dE5fG7?artist=tripleS#x")).toEqual({
      slug: "aB3dE5fG7",
    });
    expect(parseListInput("/list/aB3dE5fG7")).toEqual({ slug: "aB3dE5fG7" });
  });

  test("a profile link gives the nickname and profile slug", () => {
    expect(parseListInput("https://example.com/@izrin96/list/my-haves")).toEqual({
      nickname: "izrin96",
      profileSlug: "my-haves",
    });
  });

  test("an encoded @ and segments are decoded", () => {
    expect(parseListInput("https://example.com/%40izrin96/list/caf%C3%A9")).toEqual({
      nickname: "izrin96",
      profileSlug: "café",
    });
  });

  test("a malformed escape is kept as typed", () => {
    expect(parseListInput("/list/ab%zz")).toEqual({ slug: "ab%zz" });
  });
});
