import { describe, expect, test } from "bun:test";

import type { ChatMessage } from "@repo/api/schemas/chat";

import { canReply, currentQuote, quoteLabel, quoteText } from "./reply";

const message = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 5,
  mine: false,
  body: "wrong one, sorry",
  card: null,
  createdAt: "2026-10-28T04:35:00.000Z",
  caution: null,
  unsent: false,
  replyTo: null,
  ...over,
});

describe("canReply", () => {
  test("a text or card message from either side", () => {
    expect(canReply(message())).toBe(true);
    expect(canReply(message({ mine: true }))).toBe(true);
  });

  test("never an unsent message or an offer", () => {
    expect(canReply(message({ unsent: true, body: null }))).toBe(false);
    expect(canReply(message({ body: null, offer: {} as ChatMessage["offer"] }))).toBe(false);
  });
});

describe("currentQuote", () => {
  const snapshot = {
    id: 5,
    quote: {
      id: 5,
      mine: false,
      excerpt: "wrong one, sorry",
      card: null,
      state: "shown" as const,
    },
  };

  test("follows the cached message, so an unsend shows at once", () => {
    const quote = currentQuote(snapshot, message({ unsent: true, body: null }));
    expect(quote).toMatchObject({ state: "unsent", excerpt: null });
    expect(quoteText(quote)).not.toContain("wrong one");
  });

  test("falls back to the snapshot when the message isn't loaded", () => {
    expect(currentQuote(snapshot, undefined)).toBe(snapshot.quote);
  });
});

describe("quoteLabel", () => {
  test("holds the text the quote shows, as voice control reads it", () => {
    const quotes = [
      currentQuote(
        { id: 5, quote: { id: 5, mine: true, excerpt: null, card: null, state: "unsent" } },
        undefined,
      ),
      currentQuote(
        { id: 5, quote: { id: 5, mine: false, excerpt: null, card: null, state: "unsent" } },
        undefined,
      ),
      currentQuote(
        { id: 5, quote: { id: 5, mine: false, excerpt: "sent it", card: null, state: "shown" } },
        undefined,
      ),
    ];
    for (const quote of quotes) {
      expect(quoteLabel(quote, "haneul_07").toLowerCase()).toContain(
        quoteText(quote).toLowerCase(),
      );
    }
  });
});
