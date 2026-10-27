import { type ChatMessage, type ReplyQuote, replyQuote } from "@repo/api/schemas/chat";

import { m } from "@/paraglide/messages";
import type { DraftReply } from "@/stores/chat-draft";

/** Offers answer with Accept, Decline and Counter, and an unsent message has nothing to quote. */
export const canReply = (message: ChatMessage) =>
  !message.unsent && !message.offer && (message.body !== null || message.card !== null);

/** The quote of a cached message, cut as the server cuts it. */
export const quoteOf = (message: ChatMessage): ReplyQuote =>
  replyQuote(message.id, {
    mine: message.mine,
    body: message.body,
    cardKind: message.card?.kind ?? null,
    unsent: message.unsent,
  });

/** The draft's reply as it reads now: the cached message when held, else its snapshot. */
export const currentQuote = (reply: DraftReply, cached: ChatMessage | undefined) =>
  cached ? quoteOf(cached) : reply.quote;

export function quoteText(quote: ReplyQuote) {
  if (quote.state === "unsent") return m.chat_unsent();
  if (quote.state === "unavailable") return m.chat_quote_unavailable();
  if (quote.excerpt !== null) return quote.excerpt;
  return quote.card === "post" ? m.chat_quote_post() : m.chat_quote_objekt();
}

/** One whole sentence per variant, so no translation is assembled from pieces. */
export function quoteLabel(quote: ReplyQuote, name: string) {
  const { mine, excerpt } = quote;
  if (quote.state === "unsent") {
    return mine ? m.chat_quote_label_mine_unsent() : m.chat_quote_label_unsent({ name });
  }
  if (excerpt !== null) {
    return mine
      ? m.chat_quote_label_mine_text({ excerpt })
      : m.chat_quote_label_text({ name, excerpt });
  }
  if (quote.card === "post") {
    return mine ? m.chat_quote_label_mine_post() : m.chat_quote_label_post({ name });
  }
  return mine ? m.chat_quote_label_mine_objekt() : m.chat_quote_label_objekt({ name });
}
