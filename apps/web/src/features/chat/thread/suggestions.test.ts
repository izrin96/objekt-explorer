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

const post = (
  tag: "wtt" | "wtb" | "wts" | null,
  match: { theirs: number; yours: number } | null = null,
): PostAttachment => ({
  kind: "post",
  input: { kind: "post", listSlug: "abc" },
  view: {
    listId: 1,
    post: tag && ({ tag } as NonNullable<PostAttachment["view"]["post"]>),
    match: match && {
      ownerHas: { count: match.theirs, slugs: [] },
      senderHas: { count: match.yours, slugs: [] },
    },
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

  test("a sale post asks whether it is still for sale, whatever the match", () => {
    expect(firstLineSuggestions(post("wts"))[0]).toBe(m.chat_suggest_sale);
    expect(firstLineSuggestions(post("wts", { theirs: 2, yours: 1 }))[0]).toBe(m.chat_suggest_sale);
  });

  test("a buy post offers what the sender has, and claims nothing when they have none", () => {
    const first = (yours: number | null) =>
      firstLineSuggestions(post("wtb", yours === null ? null : { theirs: 0, yours }))[0];
    expect(first(1)).toBe(m.chat_suggest_you_have_one);
    expect(first(3)).toBe(m.chat_suggest_you_have_some);
    expect(first(0)).toBe(m.chat_suggest_wtb);
    expect(first(null)).toBe(m.chat_suggest_wtb);
  });

  test("a trade post follows the direction of the match and its count", () => {
    const first = (theirs: number, yours: number) =>
      firstLineSuggestions(post("wtt", { theirs, yours }))[0];
    expect(first(1, 1)).toBe(m.chat_suggest_match);
    expect(first(1, 0)).toBe(m.chat_suggest_they_have_one);
    expect(first(3, 0)).toBe(m.chat_suggest_they_have_some);
    expect(first(0, 1)).toBe(m.chat_suggest_you_have_one);
    expect(first(0, 3)).toBe(m.chat_suggest_you_have_some);
  });

  test("a trade post with no match, or a removed post, asks about a swap", () => {
    expect(firstLineSuggestions(post("wtt"))[0]).toBe(m.chat_suggest_post);
    expect(firstLineSuggestions(post("wtt", { theirs: 0, yours: 0 }))[0]).toBe(m.chat_suggest_post);
    expect(firstLineSuggestions(post(null))[0]).toBe(m.chat_suggest_post);
  });

  test("a post card never offers the objekt card lines, except the sale one", () => {
    for (const attachment of [post("wtt"), post("wtb"), post("wtt", { theirs: 1, yours: 0 })]) {
      const lines = firstLineSuggestions(attachment);
      for (const objektLine of [m.chat_suggest_have, m.chat_suggest_sale, m.chat_suggest_want]) {
        expect(lines).not.toContain(objektLine);
      }
    }
  });
});
