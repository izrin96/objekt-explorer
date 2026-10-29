import { describe, expect, test } from "bun:test";

import { splitLinks, type TextPart } from "./links";

const link = (url: string): TextPart => ({ kind: "link", text: url, href: url });
const text = (value: string): TextPart => ({ kind: "text", text: value });

describe("splitLinks", () => {
  test("text without a link is one part", () => {
    expect(splitLinks("have you sent it?")).toEqual([text("have you sent it?")]);
  });

  test("a link between text", () => {
    expect(splitLinks("see https://example.com/a?b=1#c for proof")).toEqual([
      text("see "),
      link("https://example.com/a?b=1#c"),
      text(" for proof"),
    ]);
  });

  test("a message that is only a link", () => {
    expect(splitLinks("http://example.com")).toEqual([link("http://example.com")]);
  });

  test("sentence punctuation after a link stays text", () => {
    expect(splitLinks("look: https://example.com/x. ok?")).toEqual([
      text("look: "),
      link("https://example.com/x"),
      text(". ok?"),
    ]);
  });

  test("a closing paren the link never opened stays text", () => {
    expect(splitLinks("(https://example.com/x)")).toEqual([
      text("("),
      link("https://example.com/x"),
      text(")"),
    ]);
  });

  test("a paren the link opened stays in it", () => {
    expect(splitLinks("https://en.wikipedia.org/wiki/Loona_(group)")).toEqual([
      link("https://en.wikipedia.org/wiki/Loona_(group)"),
    ]);
  });

  test("a link ends where Korean or Japanese text starts", () => {
    expect(splitLinks("https://example.com에서 봐")).toEqual([
      link("https://example.com"),
      text("에서 봐"),
    ]);
  });

  test("Korean in a link's path stays in it", () => {
    expect(splitLinks("여기 https://namu.wiki/w/이달의_소녀 봐")).toEqual([
      text("여기 "),
      link("https://namu.wiki/w/이달의_소녀"),
      text(" 봐"),
    ]);
  });

  test("Japanese punctuation and brackets after a link stay text", () => {
    expect(splitLinks("「https://example.com/ja/ページ」。")).toEqual([
      text("「"),
      link("https://example.com/ja/ページ"),
      text("」。"),
    ]);
  });

  test("several links and newlines", () => {
    expect(splitLinks("a https://a.com\nb https://b.com/")).toEqual([
      text("a "),
      link("https://a.com"),
      text("\nb "),
      link("https://b.com/"),
    ]);
  });

  test("other schemes and bare domains stay text", () => {
    expect(splitLinks("javascript:alert(1) data:text/html,x example.com")).toEqual([
      text("javascript:alert(1) data:text/html,x example.com"),
    ]);
  });

  test("a scheme with no host stays text", () => {
    expect(splitLinks("https://... or https://:80")).toEqual([text("https://... or https://:80")]);
  });

  test("a closing bracket the link never opened stays text", () => {
    expect(splitLinks("[https://example.com/x]")).toEqual([
      text("["),
      link("https://example.com/x"),
      text("]"),
    ]);
  });

  test("a paren then a full stop both stay text", () => {
    expect(splitLinks("(see https://example.com).")).toEqual([
      text("(see "),
      link("https://example.com"),
      text(")."),
    ]);
  });

  test("a scheme glued to a word is not a link", () => {
    expect(splitLinks("xhttps://example.com")).toEqual([text("xhttps://example.com")]);
  });
});
