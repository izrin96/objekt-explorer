import { db } from "@repo/db";
import { message } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { ActorLimits } from "../../lib/offer-rules";
import {
  type ChatMessage,
  cardKinds,
  splitCards,
  parseCaution,
  quoteSourceOf,
  type ReplyQuote,
  replyQuote,
  unsentMessage,
} from "../../schemas/chat";
import { fetchOffers, offerItemCards, toOfferView } from "../offer/view";
import { hydrateCards, hydratePostCards, parseCard } from "./cards";

type MessageRow = {
  id: number;
  senderId: string;
  body: string | null;
  card: unknown;
  createdAt: string;
  caution: string[] | null;
  offerId?: number | null;
  unsentAt?: string | null;
  replyToId?: number | null;
};

const quoted = alias(message, "quoted");

/**
 * The quotes of these replies, read now, so an unsend since the reply shows. A quoted message is
 * read through its reply's conversation only, so a stored id never reaches another one.
 */
async function readQuotes(replies: { id: number; replyToId: number }[], viewerId: string) {
  if (replies.length === 0) return new Map<number, ReplyQuote>();
  const rows = await db
    .select({
      id: quoted.id,
      senderId: quoted.senderId,
      body: quoted.body,
      card: quoted.card,
      unsentAt: quoted.unsentAt,
    })
    .from(message)
    .innerJoin(
      quoted,
      and(eq(quoted.id, message.replyToId), eq(quoted.conversationId, message.conversationId)),
    )
    .where(
      inArray(
        message.id,
        replies.map((reply) => reply.id),
      ),
    );
  const found = new Map(rows.map((row) => [row.id, { ...row, card: parseCard(row.card) }]));
  return new Map(
    replies.map(({ replyToId }) => [
      replyToId,
      replyQuote(replyToId, quoteSourceOf(found.get(replyToId), viewerId)),
    ]),
  );
}

/** `limits` are the viewer's own, so an offer card offers only what the viewer may do. */
export async function toChatMessages(
  rows: MessageRow[],
  viewerId: string,
  limits: ActorLimits = {},
) {
  const cards = rows.map((row) => (row.unsentAt ? null : parseCard(row.card)));
  const offersRead = fetchOffers(
    rows.flatMap((row) => (row.offerId ? [row.offerId] : [])),
    viewerId,
  );
  const split = splitCards(cards);
  const replies = rows.flatMap((row) =>
    row.replyToId && !row.unsentAt ? [{ id: row.id, replyToId: row.replyToId }] : [],
  );
  // only the objekt cards wait for the offers, whose items they draw
  const [offers, objekts, posts, quotes] = await Promise.all([
    offersRead,
    offersRead.then((read) =>
      hydrateCards([...split.objekts, ...offerItemCards(read.values())], viewerId),
    ),
    hydratePostCards(split.posts, viewerId),
    readQuotes(replies, viewerId),
  ]);
  const { view, serial } = objekts;
  const now = new Date();
  const messages: ChatMessage[] = rows.map((row, i) => {
    const card = cardKinds(cards[i] ?? null);
    const offer = row.offerId ? offers.get(row.offerId) : undefined;
    if (row.unsentAt) {
      return unsentMessage({
        id: row.id,
        mine: row.senderId === viewerId,
        createdAt: new Date(row.createdAt).toISOString(),
      });
    }
    return {
      id: row.id,
      mine: row.senderId === viewerId,
      body: row.body,
      card: card.objekt ? view(card.objekt) : card.post ? posts.view(card.post) : null,
      createdAt: new Date(row.createdAt).toISOString(),
      // an offer's caution is its note's, shown on the offer card
      caution: row.senderId === viewerId || offer ? null : parseCaution(row.caution),
      offer: offer ? toOfferView(offer, viewerId, now, limits, serial) : null,
      unsent: false,
      replyTo: row.replyToId ? (quotes.get(row.replyToId) ?? null) : null,
    };
  });
  const collectionMap = { ...objekts.collections, ...posts.collections };
  return { messages, collections: collectionMap };
}
