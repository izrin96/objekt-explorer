import { describe, expect, test } from "bun:test";

import {
  chatMessageSchema,
  isPostCard,
  listConversationsInputSchema,
  messageBodySchema,
  quoteSourceOf,
  REPLY_EXCERPT_MAX,
  replyQuote,
  sendInputSchema,
  startInputSchema,
  storedCardSchema,
  storedObjektCardSchema,
} from "./chat";

const clientId = "0b1c6f0e-5c1f-4d3e-9a3e-7f9d2a1b4c5d";

describe("listConversationsInputSchema", () => {
  test("box defaults to inbox, show to all, and a cursor is optional", () => {
    expect(listConversationsInputSchema.parse({})).toEqual({ box: "inbox", show: "all" });
    expect(listConversationsInputSchema.parse({ box: "archived" })).toEqual({
      box: "archived",
      show: "all",
    });
    const cursor = { at: "2026-10-01 12:00:00+00", id: 7 };
    expect(listConversationsInputSchema.parse({ box: "requests", cursor })).toEqual({
      box: "requests",
      cursor,
      show: "all",
    });
  });

  test("show takes the Inbox chips only", () => {
    expect(listConversationsInputSchema.parse({ show: "needs-you" }).show).toBe("needs-you");
    expect(listConversationsInputSchema.safeParse({ show: "mine" }).success).toBe(false);
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
    const result = sendInputSchema.safeParse({ conversationId: 1, clientId, body: "​" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("empty");
  });
});

describe("send input", () => {
  test("refuses a send without its clientId", () => {
    expect(sendInputSchema.safeParse({ conversationId: 1, body: "hi" }).success).toBe(false);
  });

  test("clientId must be a uuid", () => {
    expect(sendInputSchema.safeParse({ conversationId: 1, body: "hi", clientId }).success).toBe(
      true,
    );
    expect(
      sendInputSchema.safeParse({ conversationId: 1, body: "hi", clientId: "x" }).success,
    ).toBe(false);
  });

  test("replyTo is optional, so an open tab's send validates unchanged", () => {
    const plain = sendInputSchema.parse({ conversationId: 1, body: "hi", clientId });
    expect(plain).toEqual({ conversationId: 1, body: "hi", clientId });
    expect(
      sendInputSchema.parse({ conversationId: 1, body: "hi", clientId, replyTo: 7 }).replyTo,
    ).toBe(7);
    expect(
      sendInputSchema.safeParse({ conversationId: 1, body: "hi", clientId, replyTo: 0 }).success,
    ).toBe(false);
  });

  test("card slugs refuse NUL", () => {
    expect(
      sendInputSchema.safeParse({
        conversationId: 1,
        clientId,
        card: { kind: "objekt", collectionSlug: "a\0b" },
      }).success,
    ).toBe(false);
    expect(
      sendInputSchema.safeParse({
        conversationId: 1,
        clientId,
        card: { kind: "objekt", collectionSlug: "seoyeon-204z" },
      }).success,
    ).toBe(true);
  });
});

describe("cards", () => {
  const objektInput = {
    kind: "objekt" as const,
    collectionSlug: "seoyeon-204z",
    objektId: "123",
    listSlug: "abc123",
  };
  const stored = {
    kind: "objekt" as const,
    collectionSlug: "seoyeon-204z",
    objektId: "123",
    listId: 7,
  };
  const match = {
    ownerHas: { count: 5, slugs: ["a", "b", "c"] },
    senderHas: { count: 1, slugs: ["d"] },
  };

  test("an objekt input names its kind", () => {
    const parsed = startInputSchema.parse({
      to: { kind: "list", slug: "abc123" },
      card: objektInput,
    });
    expect(parsed.card).toEqual(objektInput);
    const { kind: _, ...unnamed } = objektInput;
    expect(sendInputSchema.safeParse({ conversationId: 1, clientId, card: unnamed }).success).toBe(
      false,
    );
  });

  test("a post input parses as a post, with or without a match request", () => {
    const card = { kind: "post" as const, listSlug: "abc123" };
    expect(sendInputSchema.parse({ conversationId: 1, clientId, card }).card).toEqual(card);
    const withMatch = { ...card, withMatch: true };
    expect(sendInputSchema.parse({ conversationId: 1, clientId, card: withMatch }).card).toEqual(
      withMatch,
    );
  });

  test("a post input names a list, never a collection", () => {
    for (const card of [
      { kind: "post" },
      { kind: "post", collectionSlug: "seoyeon-204z" },
      { kind: "post", listSlug: "a\0b" },
    ]) {
      expect(sendInputSchema.safeParse({ conversationId: 1, clientId, card }).success).toBe(false);
    }
  });

  test("a stored objekt card parses unchanged and is no post card", () => {
    const parsed = storedCardSchema.parse(stored);
    expect(parsed).toEqual(stored);
    expect(isPostCard(parsed)).toBe(false);
    expect(storedObjektCardSchema.parse(stored)).toEqual(stored);
  });

  test("a stored card without its kind reads as no card", () => {
    const { kind: _, ...unnamed } = stored;
    expect(storedCardSchema.safeParse(unnamed).success).toBe(false);
  });

  test("a stored post card parses as a post and is no objekt card", () => {
    const post = { kind: "post" as const, listId: 7, match };
    const parsed = storedCardSchema.parse(post);
    expect(parsed).toEqual(post);
    expect(isPostCard(parsed)).toBe(true);
    expect(storedObjektCardSchema.safeParse(post).success).toBe(false);
  });

  test("a saved match parses with or without whether the two could swap", () => {
    const post = { kind: "post" as const, listId: 7, match };
    expect(storedCardSchema.parse(post)).toEqual(post);
    const swapped = { ...post, match: { ...match, canSwap: false } };
    expect(storedCardSchema.parse(swapped)).toEqual(swapped);
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

describe("replyQuote", () => {
  const text = (body: string | null, cardKind: "objekt" | "post" | null = null) => ({
    mine: false,
    body,
    cardKind,
    unsent: false,
  });

  test("plain text is quoted whole", () => {
    expect(replyQuote(5, text("sent 2 already, check the trade page"))).toEqual({
      id: 5,
      mine: false,
      excerpt: "sent 2 already, check the trade page",
      card: null,
      state: "shown",
    });
  });

  test("a long first line is cut at 120 code points, emoji counted as one", () => {
    const line = "🫶".repeat(100) + "a".repeat(200);
    const { excerpt } = replyQuote(5, text(line));
    expect(Array.from(excerpt!)).toHaveLength(REPLY_EXCERPT_MAX + 1);
    expect(excerpt).toBe("🫶".repeat(100) + "a".repeat(20) + "…");
  });

  test("a multi-line body quotes its first line", () => {
    expect(replyQuote(5, text("  got them both\nthanks!\n")).excerpt).toBe("got them both…");
  });

  test("text with a card quotes the text", () => {
    expect(replyQuote(5, text("still have this one?", "objekt"))).toMatchObject({
      excerpt: "still have this one?",
      card: null,
    });
  });

  test("a card-only message is quoted by its kind", () => {
    expect(replyQuote(5, text(null, "objekt"))).toMatchObject({ excerpt: null, card: "objekt" });
    expect(replyQuote(5, { ...text(null, "post"), mine: true })).toMatchObject({
      excerpt: null,
      card: "post",
      mine: true,
      state: "shown",
    });
  });

  test("a cut lands without trailing space before the ellipsis", () => {
    const line = "a".repeat(REPLY_EXCERPT_MAX - 1) + " b";
    expect(replyQuote(5, text(line)).excerpt).toBe("a".repeat(REPLY_EXCERPT_MAX - 1) + "…");
  });

  test("lines that render as nothing are skipped", () => {
    expect(replyQuote(5, text("\u200b\u3164\nsent it")).excerpt).toBe("sent it");
  });

  test("a message with neither text nor card is unavailable", () => {
    expect(replyQuote(5, text(null))).toMatchObject({ state: "unavailable", mine: null });
  });

  test("an unsent message shows neither text nor card", () => {
    expect(replyQuote(5, { ...text("wrong one, sorry", "objekt"), unsent: true })).toEqual({
      id: 5,
      mine: false,
      excerpt: null,
      card: null,
      state: "unsent",
    });
  });

  test("a missing row is unavailable", () => {
    expect(replyQuote(5, null)).toEqual({
      id: 5,
      mine: null,
      excerpt: null,
      card: null,
      state: "unavailable",
    });
  });
});

describe("chatMessageSchema", () => {
  test("a message from before replies parses with no quote", () => {
    const parsed = chatMessageSchema.parse({
      id: 1,
      mine: true,
      body: "hi",
      card: null,
      createdAt: "2026-10-28T00:00:00.000Z",
      caution: null,
      unsent: false,
    });
    expect(parsed.replyTo).toBeNull();
  });
});

describe("quoteSourceOf", () => {
  const row = {
    senderId: "me",
    body: "wrong one, sorry",
    card: { kind: "objekt" as const, collectionSlug: "seoah-203z" },
    unsentAt: null,
  };

  test("reads the side, text and card kind of a stored row", () => {
    expect(quoteSourceOf(row, "me")).toEqual({
      mine: true,
      body: "wrong one, sorry",
      cardKind: "objekt",
      unsent: false,
    });
    expect(quoteSourceOf(row, "them")?.mine).toBe(false);
  });

  test("an unsent row quotes as unsent, never with its text or card", () => {
    const source = quoteSourceOf({ ...row, unsentAt: "2026-10-28 04:40:00+00" }, "them");
    expect(source?.unsent).toBe(true);
    expect(replyQuote(5, source)).toMatchObject({ state: "unsent", excerpt: null, card: null });
  });

  test("a row that is gone, or in another conversation, is unavailable", () => {
    expect(replyQuote(5, quoteSourceOf(undefined, "me")).state).toBe("unavailable");
  });
});
