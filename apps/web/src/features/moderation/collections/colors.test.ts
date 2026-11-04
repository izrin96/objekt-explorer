import { describe, expect, test } from "bun:test";

import { colorChange, matchesSearch, rowColors } from "./colors";

const seoyeon = {
  slug: "ever01-seoyeon-338z",
  member: "SeoYeon",
  collectionNo: "338Z",
  textColor: "#07328d",
  backgroundColor: "#f9f8f2",
};

describe("matchesSearch", () => {
  test("member and collection number, in any case and order", () => {
    expect(matchesSearch(seoyeon, "seoyeon 338")).toBe(true);
    expect(matchesSearch(seoyeon, "338Z SEOYEON")).toBe(true);
  });

  test("the slug, whole or in part", () => {
    expect(matchesSearch(seoyeon, "ever01-seoyeon-338z")).toBe(true);
    expect(matchesSearch(seoyeon, "ever01")).toBe(true);
  });

  test("every word must match", () => {
    expect(matchesSearch(seoyeon, "seoyeon 339")).toBe(false);
  });

  test("an empty search matches everything", () => {
    expect(matchesSearch(seoyeon, "  ")).toBe(true);
  });
});

describe("rowColors", () => {
  test("with no override the list's colours are the source's", () => {
    expect(rowColors(seoyeon, undefined)).toEqual({
      text: { current: "#07328d", source: "#07328d", overridden: false },
      background: { current: "#f9f8f2", source: "#f9f8f2", overridden: false },
    });
  });

  test("an override names its colour and keeps the source beside it", () => {
    const override = {
      textColor: "#07328d",
      backgroundColor: null,
      source: { textColor: "#000000", backgroundColor: "#f9f8f2" },
    };
    expect(rowColors(seoyeon, override)).toEqual({
      text: { current: "#07328d", source: "#000000", overridden: true },
      background: { current: "#f9f8f2", source: "#f9f8f2", overridden: false },
    });
  });
});

describe("colorChange", () => {
  const colors = {
    text: { current: "#07328d", source: "#000000", overridden: true },
    background: { current: "#f9f8f2", source: "#f9f8f2", overridden: false },
  };

  test("a field left as it was is not sent", () => {
    expect(colorChange(colors, { text: "#07328D", background: "#F9F8F2" })).toEqual({});
  });

  test("a new colour is sent lowercase", () => {
    expect(colorChange(colors, { text: "#07328d", background: "#B400FF" })).toEqual({
      backgroundColor: "#b400ff",
    });
  });

  test("typing an overridden colour back to the source resets it", () => {
    expect(colorChange(colors, { text: "#000000", background: "#f9f8f2" })).toEqual({
      textColor: null,
    });
  });

  test("an invalid field gives no change at all", () => {
    expect(colorChange(colors, { text: "#fff", background: "#b400ff" })).toBeNull();
  });
});
