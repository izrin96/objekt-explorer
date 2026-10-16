import { describe, expect, test } from "bun:test";

import {
  isPostCard,
  listConversationsInputSchema,
  messageBodySchema,
  sendInputSchema,
  startInputSchema,
  storedCardSchema,
  storedObjektCardSchema,
} from "./chat";

describe("listConversationsInputSchema", () => {
  test("the inputs a tab opened before the context field sends still validate", () => {
    expect(listConversationsInputSchema.parse({})).toEqual({ box: "inbox" });
    expect(listConversationsInputSchema.parse({ box: "archived" })).toEqual({ box: "archived" });
    const cursor = { at: "2026-10-01 12:00:00+00", id: 7 };
    expect(listConversationsInputSchema.parse({ box: "requests", cursor })).toEqual({
      box: "requests",
      cursor,
    });
  });
});

describe("cursor at", () => {
  test.each([
    // as Postgres wrote them in a list response
    "2026-10-12 17:55:32.071176+00",
    "2026-10-10 21:17:47.617444+00",
    "2026-10-01 12:00:00+00",
    "2026-10-01 12:00:00.123456+00",
    "2026-10-01 12:00:00.5+09",
    "2026-10-01 12:00:00+05:30",
    "2026-10-01T12:00:00.000Z".replace("Z", "+00"),
  ])("accepts %s", (at) => {
    expect(listConversationsInputSchema.safeParse({ cursor: { at, id: 1 } }).success).toBe(true);
  });

  test.each(["", "yesterday", "2026-10-01; DROP TABLE x", "2026-10-01 12:00:00\0+00"])(
    "refuses %j",
    (at) => {
      expect(listConversationsInputSchema.safeParse({ cursor: { at, id: 1 } }).success).toBe(false);
    },
  );
});

describe("message body", () => {
  test("keeps text, trims it, and refuses blank-rendering input", () => {
    expect(messageBodySchema.parse("  hi ")).toBe("hi");
    for (const body of ["​​", "⠀", "ㅤ ᅟᅠﾠ", "a\0b", "   "]) {
      expect(messageBodySchema.safeParse(body).success).toBe(false);
    }
    expect(messageBodySchema.safeParse("a​b").success).toBe(true);
  });

  test("the refusal reads as the existing empty error", () => {
    const result = sendInputSchema.safeParse({ conversationId: 1, body: "​" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("empty");
  });
});

describe("send input", () => {
  test("an old tab's input without clientId still validates", () => {
    expect(sendInputSchema.parse({ conversationId: 1, body: "hi" })).toEqual({
      conversationId: 1,
      body: "hi",
    });
  });

  test("clientId must be a uuid", () => {
    const clientId = "0b1c6f0e-5c1f-4d3e-9a3e-7f9d2a1b4c5d";
    expect(sendInputSchema.safeParse({ conversationId: 1, body: "hi", clientId }).success).toBe(
      true,
    );
    expect(
      sendInputSchema.safeParse({ conversationId: 1, body: "hi", clientId: "x" }).success,
    ).toBe(false);
  });

  test("card slugs refuse NUL", () => {
    expect(
      sendInputSchema.safeParse({ conversationId: 1, card: { collectionSlug: "a\0b" } }).success,
    ).toBe(false);
    expect(
      sendInputSchema.safeParse({ conversationId: 1, card: { collectionSlug: "seoyeon-204z" } })
        .success,
    ).toBe(true);
  });
});

describe("cards", () => {
  const objektInput = { collectionSlug: "seoyeon-204z", objektId: "123", listSlug: "abc123" };
  const stored = { collectionSlug: "seoyeon-204z", objektId: "123", listId: 7 };
  const match = {
    ownerHas: { count: 5, slugs: ["a", "b", "c"] },
    senderHas: { count: 1, slugs: ["d"] },
  };

  test("an old tab's objekt input validates to the same data, with no kind added", () => {
    const parsed = startInputSchema.parse({
      to: { kind: "list", slug: "abc123" },
      card: objektInput,
    });
    expect(parsed.card).toEqual(objektInput);
    expect(sendInputSchema.parse({ conversationId: 1, card: objektInput }).card).toEqual(
      objektInput,
    );
  });

  test("an objekt input may name its kind", () => {
    const named = { ...objektInput, kind: "objekt" as const };
    expect(sendInputSchema.parse({ conversationId: 1, card: named }).card).toEqual(named);
  });

  test("a post input parses as a post, with or without a match request", () => {
    const card = { kind: "post" as const, listSlug: "abc123" };
    expect(sendInputSchema.parse({ conversationId: 1, card }).card).toEqual(card);
    const withMatch = { ...card, withMatch: true };
    expect(sendInputSchema.parse({ conversationId: 1, card: withMatch }).card).toEqual(withMatch);
  });

  test("a post input names a list, never a collection", () => {
    for (const card of [
      { kind: "post" },
      { kind: "post", collectionSlug: "seoyeon-204z" },
      { kind: "post", listSlug: "a\0b" },
    ]) {
      expect(sendInputSchema.safeParse({ conversationId: 1, card }).success).toBe(false);
    }
  });

  test("a stored card without a kind is an objekt card, unchanged", () => {
    const parsed = storedCardSchema.parse(stored);
    expect(parsed).toEqual(stored);
    expect(isPostCard(parsed)).toBe(false);
    expect(storedObjektCardSchema.parse(stored)).toEqual(stored);
  });

  test("a stored post card parses as a post and is no objekt card", () => {
    const post = { kind: "post" as const, listId: 7, match };
    const parsed = storedCardSchema.parse(post);
    expect(parsed).toEqual(post);
    expect(isPostCard(parsed)).toBe(true);
    expect(storedObjektCardSchema.safeParse(post).success).toBe(false);
  });

  test("a saved match names at most three collections a side", () => {
    const four = {
      ownerHas: { count: 4, slugs: ["a", "b", "c", "d"] },
      senderHas: match.senderHas,
    };
    expect(storedCardSchema.safeParse({ kind: "post", listId: 7, match: four }).success).toBe(
      false,
    );
  });

  test("a kind this server does not know reads as no card", () => {
    expect(storedCardSchema.safeParse({ kind: "banner", listId: 7 }).success).toBe(false);
  });
});
