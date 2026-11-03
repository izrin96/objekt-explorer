import { describe, expect, test } from "bun:test";

import { normalizeUserText } from "./user-text";

describe("normalizeUserText", () => {
  test("turns CRLF and CR into LF", () => {
    expect(normalizeUserText("WTT Wonder\r\nDMs open\rafter 6pm")).toBe(
      "WTT Wonder\nDMs open\nafter 6pm",
    );
  });

  test("keeps blank lines and indentation, the first line's too", () => {
    expect(normalizeUserText("Hi\n\n\n\nWTT")).toBe("Hi\n\n\n\nWTT");
    expect(normalizeUserText("   \u2605 WTT \u2605\n     dm me")).toBe(
      "   \u2605 WTT \u2605\n     dm me",
    );
  });

  test("drops blank lines at the start and end, and spaces at line ends", () => {
    expect(normalizeUserText("\n\n  Hi   \nWTT  \n\n")).toBe("  Hi\nWTT");
  });

  test("keeps rows of fillers used as decoration", () => {
    expect(normalizeUserText("Hi\n\u2800\u2800\u2800\n\u3164\nWTT")).toBe(
      "Hi\n\u2800\u2800\u2800\n\u3164\nWTT",
    );
  });

  test("turns a tab into a space", () => {
    expect(normalizeUserText("a\tb")).toBe("a b");
  });

  test("drops control characters and bidi marks", () => {
    expect(normalizeUserText("a\u0000b\u0007c")).toBe("abc");
    expect(normalizeUserText("x\u202Eevil\u202C\u2066y\u2069")).toBe("xevily");
  });

  test("only spaces or invisible fillers is nothing", () => {
    expect(normalizeUserText("")).toBeNull();
    expect(normalizeUserText(" \n\t \r\n ")).toBeNull();
    expect(normalizeUserText("\u200B")).toBeNull();
    expect(normalizeUserText("\u3164 \u2800\n\uFEFF")).toBeNull();
  });

  test("any default-ignorable or filler text is nothing", () => {
    expect(normalizeUserText("\u200F\n\u200F")).toBeNull();
    expect(normalizeUserText("\u00AD\u034F\u180E\uFE0F\u2061")).toBeNull();
    expect(normalizeUserText("\u{E0068}\u{E0069}")).toBeNull();
    expect(normalizeUserText("\u17B4\uFFA0\u115F")).toBeNull();
  });

  test("drops the implicit direction marks too", () => {
    expect(normalizeUserText("abc\u200Fdef\u200E\u061C")).toBe("abcdef");
  });

  test("treats line and paragraph separators as line breaks", () => {
    expect(normalizeUserText("a  \u2028\u2028  b")).toBe("a\n\n  b");
    expect(normalizeUserText("\u2028\u2029hi")).toBe("hi");
  });

  test("keeps ZWJ inside text, as emoji need it", () => {
    expect(normalizeUserText("family \u{1F468}\u200D\u{1F469}\u200D\u{1F467}")).toBe(
      "family \u{1F468}\u200D\u{1F469}\u200D\u{1F467}",
    );
  });

  test("leaves markup and URLs as typed", () => {
    expect(normalizeUserText("<b>hi</b> **bold** https://example.com")).toBe(
      "<b>hi</b> **bold** https://example.com",
    );
  });
});
