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
    const plain = (current: string, pinByDefault: boolean) => ({
      current,
      source: current,
      overridden: false,
      pinned: false,
      cosmo: null,
      resetTo: current,
      pinByDefault,
      siblings: null,
    });
    expect(rowColors(seoyeon, undefined)).toEqual({
      text: plain("#07328d", false),
      background: plain("#f9f8f2", true),
    });
  });

  test("an override names its colour and keeps the source beside it", () => {
    const override = {
      textColor: "#07328d",
      backgroundColor: null,
      source: { textColor: "#000000", backgroundColor: "#f9f8f2" },
    };
    const { text } = rowColors(seoyeon, override);
    expect(text).toMatchObject({ current: "#07328d", source: "#000000", overridden: true });
    expect(text.cosmo).toBeNull();
  });

  test("a text override names the read siblings whose colour it shows", () => {
    const override = {
      textColor: "#2d1f17",
      backgroundColor: null,
      source: { textColor: "#ffffff", backgroundColor: "#f9f8f2" },
      textMatchesSiblings: [{ member: "Kimlip" }, { member: "HeeJin" }],
    };
    const { text, background } = rowColors(seoyeon, override);
    expect(text.siblings).toEqual(["Kimlip", "HeeJin"]);
    expect(background.siblings).toBeNull();
  });

  test("an override shows its pin and Cosmo's colour when it is not the source's", () => {
    const override = {
      textColor: "#000000",
      backgroundColor: null,
      textPinned: true,
      source: { textColor: "#ffffff", backgroundColor: "#f9f8f2" },
      cosmo: { textColor: "#2d1f17", backgroundColor: "#f9f8f2" },
    };
    expect(rowColors(seoyeon, override).text).toMatchObject({
      pinned: true,
      cosmo: "#2d1f17",
      resetTo: "#2d1f17",
      pinByDefault: true,
    });
  });
});

describe("colorChange", () => {
  const colors = rowColors(seoyeon, {
    textColor: "#07328d",
    backgroundColor: null,
    source: { textColor: "#000000", backgroundColor: "#f9f8f2" },
    cosmo: { textColor: null, backgroundColor: "#f9f8f2" },
  });
  const pins = { textPinned: false, backgroundPinned: false };

  test("a field left as it was is not sent", () => {
    expect(colorChange(colors, { text: "#07328D", background: "#F9F8F2", ...pins })).toEqual({});
  });

  test("a new colour is sent lowercase", () => {
    expect(
      colorChange(colors, {
        text: "#07328d",
        background: "#B400FF",
        ...pins,
        backgroundPinned: true,
      }),
    ).toEqual({ backgroundColor: "#b400ff", backgroundPinned: true });
  });

  test("typing an overridden colour back to the source resets it", () => {
    expect(
      colorChange(colors, { text: "#000000", background: "#f9f8f2", ...pins, textPinned: true }),
    ).toEqual({
      textColor: null,
    });
  });

  test("with Cosmo's colour known, typing the source keeps an override and typing Cosmo's resets", () => {
    const jiwoo = rowColors(seoyeon, {
      textColor: "#000000",
      backgroundColor: null,
      source: { textColor: "#ffffff", backgroundColor: "#f9f8f2" },
      cosmo: { textColor: "#2d1f17", backgroundColor: "#f9f8f2" },
    });
    expect(colorChange(jiwoo, { text: "#ffffff", background: "#f9f8f2", ...pins })).toEqual({
      textColor: "#ffffff",
      textPinned: false,
    });
    expect(colorChange(jiwoo, { text: "#2D1F17", background: "#f9f8f2", ...pins })).toEqual({
      textColor: null,
    });
  });

  test("a pin changed on an override that stays is sent alone", () => {
    expect(
      colorChange(colors, { text: "#07328d", background: "#f9f8f2", ...pins, textPinned: true }),
    ).toEqual({ textPinned: true });
  });

  test("an invalid field gives no change at all", () => {
    expect(colorChange(colors, { text: "#fff", background: "#b400ff", ...pins })).toBeNull();
  });
});
