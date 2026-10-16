import { describe, expect, test } from "bun:test";

import type { ListTypeNew } from "@repo/api/schemas/list";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { m } from "@/paraglide/messages";

import type { Attachment, PostAttachment } from "../attachment";
import { firstLineSuggestions } from "./suggestions";

const objekt = (listType?: ListTypeNew): Attachment => ({
  kind: "objekt",
  input: { collectionSlug: "seoyeon-204z" },
  objekt: {} as ValidObjekt,
  listName: null,
  listType,
});

const post = (match: boolean): PostAttachment => ({
  kind: "post",
  input: { kind: "post", listSlug: "abc" },
  view: {
    listId: 1,
    post: null,
    match: match
      ? { ownerHas: { count: 1, slugs: ["a"] }, senderHas: { count: 0, slugs: [] } }
      : null,
  },
  collections: {},
});

describe("firstLineSuggestions", () => {
  test("a sale card asks whether it is still for sale, first", () => {
    expect(firstLineSuggestions(objekt("sale"))[0]).toBe(m.chat_suggest_sale);
  });

  test("a have card asks to trade, a want card offers it", () => {
    expect(firstLineSuggestions(objekt("have"))[0]).toBe(m.chat_suggest_have);
    expect(firstLineSuggestions(objekt("want"))[0]).toBe(m.chat_suggest_want);
  });

  test("no card, or a general list, gets only the general ones", () => {
    expect(firstLineSuggestions(undefined)).toEqual([m.chat_suggest_open, m.chat_suggest_hi]);
    expect(firstLineSuggestions(null)).toEqual([m.chat_suggest_open, m.chat_suggest_hi]);
    expect(firstLineSuggestions(objekt("general"))).toEqual([
      m.chat_suggest_open,
      m.chat_suggest_hi,
    ]);
  });

  test("a post card asks about a swap, or about the match it carries", () => {
    expect(firstLineSuggestions(post(false))[0]).toBe(m.chat_suggest_post);
    expect(firstLineSuggestions(post(true))[0]).toBe(m.chat_suggest_match);
  });

  test("a post card never offers the objekt card lines", () => {
    for (const attachment of [post(false), post(true)]) {
      const lines = firstLineSuggestions(attachment);
      for (const objektLine of [m.chat_suggest_have, m.chat_suggest_sale, m.chat_suggest_want]) {
        expect(lines).not.toContain(objektLine);
      }
    }
  });
});
