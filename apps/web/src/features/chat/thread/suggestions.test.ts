import { describe, expect, test } from "bun:test";

import { m } from "@/paraglide/messages";

import { firstLineSuggestions } from "./suggestions";

describe("firstLineSuggestions", () => {
  test("a sale card asks whether it is still for sale, first", () => {
    expect(firstLineSuggestions("sale")[0]).toBe(m.chat_suggest_sale);
  });

  test("a have card asks to trade, a want card offers it", () => {
    expect(firstLineSuggestions("have")[0]).toBe(m.chat_suggest_have);
    expect(firstLineSuggestions("want")[0]).toBe(m.chat_suggest_want);
  });

  test("no card, or a general list, gets only the general ones", () => {
    expect(firstLineSuggestions(undefined)).toEqual([m.chat_suggest_open, m.chat_suggest_hi]);
    expect(firstLineSuggestions("general")).toEqual([m.chat_suggest_open, m.chat_suggest_hi]);
  });
});
