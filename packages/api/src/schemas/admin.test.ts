import { describe, expect, test } from "bun:test";

import { hexColor, parseHexColor, setCollectionColorsInputSchema } from "./admin";

describe("parseHexColor", () => {
  test("six hex digits after # in any case read as lowercase", () => {
    expect(parseHexColor("#07328D")).toBe("#07328d");
    expect(parseHexColor("#b400ff")).toBe("#b400ff");
  });

  test("surrounding spaces are ignored", () => {
    expect(parseHexColor(" #FFFFFF ")).toBe("#ffffff");
  });

  test("three digits, a missing # and non-hex letters are refused", () => {
    expect(parseHexColor("#fff")).toBeNull();
    expect(parseHexColor("fff")).toBeNull();
    expect(parseHexColor("ffffff")).toBeNull();
    expect(parseHexColor("#ggg000")).toBeNull();
    expect(parseHexColor("#ffffff0")).toBeNull();
  });
});

describe("hexColor", () => {
  test("normalises a valid colour and refuses the rest", () => {
    expect(hexColor.parse("#B400FF")).toBe("#b400ff");
    expect(hexColor.safeParse("#fff").success).toBe(false);
  });
});

describe("setCollectionColorsInputSchema", () => {
  test("null resets a colour and an absent key keeps it", () => {
    const parsed = setCollectionColorsInputSchema.parse({
      slug: "atom01-heejin-322z",
      textColor: null,
    });
    expect(parsed.textColor).toBeNull();
    expect("backgroundColor" in parsed).toBe(false);
  });

  test("a save that names no colour is refused", () => {
    expect(setCollectionColorsInputSchema.safeParse({ slug: "atom01-heejin-322z" }).success).toBe(
      false,
    );
  });

  test("a three-digit colour is refused", () => {
    expect(
      setCollectionColorsInputSchema.safeParse({ slug: "atom01-heejin-322z", textColor: "#fff" })
        .success,
    ).toBe(false);
  });
});
