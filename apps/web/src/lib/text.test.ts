import { describe, expect, it } from "bun:test";

import { joinList, joinSentences, sentenceGap } from "./text";

describe("sentenceGap", () => {
  it("is empty only for ja", () => {
    expect(sentenceGap("en")).toBe(" ");
    expect(sentenceGap("ja")).toBe("");
    expect(sentenceGap("ko")).toBe(" ");
  });
});

describe("joinSentences", () => {
  it("joins with the locale gap and skips empty parts", () => {
    const parts = ["One.", null, "", undefined, "Two."];
    expect(joinSentences(parts, "en")).toBe("One. Two.");
    expect(joinSentences(parts, "ja")).toBe("One.Two.");
    expect(joinSentences(parts, "ko")).toBe("One. Two.");
  });
});

describe("joinList", () => {
  const one = ["A"];
  const two = ["A", "B"];
  const three = ["A", "B", "C"];

  it("prose", () => {
    expect(joinList(one, "prose", "en")).toBe("A");
    expect(joinList(two, "prose", "en")).toBe("A and B");
    expect(joinList(three, "prose", "en")).toBe("A, B, and C");
    expect(joinList(two, "prose", "ja")).toBe("A、B");
    expect(joinList(three, "prose", "ja")).toBe("A、B、C");
    expect(joinList(two, "prose", "ko")).toBe("A 및 B");
    expect(joinList(three, "prose", "ko")).toBe("A, B 및 C");
  });

  it("compact", () => {
    expect(joinList(one, "compact", "en")).toBe("A");
    expect(joinList(two, "compact", "en")).toBe("A, B");
    expect(joinList(three, "compact", "en")).toBe("A, B, C");
    expect(joinList(two, "compact", "ja")).toBe("A、B");
    expect(joinList(three, "compact", "ja")).toBe("A、B、C");
    expect(joinList(two, "compact", "ko")).toBe("A 및 B");
    expect(joinList(three, "compact", "ko")).toBe("A, B 및 C");
  });
});
