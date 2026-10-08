import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, userAddress } from "@repo/db/schema";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray } from "drizzle-orm";

import { cardListAllowed } from "../../lib/chat-rules";
import type { ActorLimits } from "../../lib/offer-rules";
import { unique } from "../../lib/unique";
import {
  type CardInput,
  type CardView,
  type ChatMessage,
  parseCaution,
  type StoredCard,
  storedCardSchema,
  unsentMessage,
} from "../../schemas/chat";
import { fetchCollectionsBySlug } from "../list";
import { fetchOffers, offerItemCards, toOfferView } from "../offer/view";
import { refuse } from "./refuse";

type CardContext = { senderId: string; partnerId: string };

/** An objekt only of the card's collection, and a list by `cardListAllowed`. */
export async function resolveCard(input: CardInput, context: CardContext): Promise<StoredCard> {
  const [list, collection, objekt] = await Promise.all([
    input.listSlug === undefined
      ? undefined
      : db
          .select({
            id: lists.id,
            ownerId: lists.userId,
          })
          .from(lists)
          .where(eq(lists.slug, input.listSlug))
          .then((rows) => rows[0] ?? null),
    indexer
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.slug, input.collectionSlug))
      .then((rows) => rows[0] ?? null),
    input.objektId === undefined
      ? undefined
      : indexer
          .select({ collectionId: objekts.collectionId })
          .from(objekts)
          .where(eq(objekts.id, input.objektId))
          .then((rows) => rows[0] ?? null),
  ]);

  if (list === null || collection === null || objekt === null) refuse("invalid_card");
  if (list && !cardListAllowed(list, context.senderId, context.partnerId)) {
    refuse("invalid_card");
  }
  if (objekt && objekt.collectionId !== collection.id) refuse("invalid_card");

  return {
    collectionSlug: input.collectionSlug,
    ...(input.objektId === undefined ? {} : { objektId: input.objektId }),
    ...(list ? { listId: list.id } : {}),
  };
}

export function parseCard(value: unknown): StoredCard | null {
  if (value === null) return null;
  const parsed = storedCardSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Read live, so a card follows its list's name and price and drops a deleted list. */
export async function hydrateCards(cards: StoredCard[]) {
  const listIds = unique(cards.flatMap((card) => (card.listId === undefined ? [] : [card.listId])));
  const objektIds = unique(
    cards.flatMap((card) => (card.objektId === undefined ? [] : [card.objektId])),
  );
  const slugs = unique(cards.map((card) => card.collectionSlug));

  const [listRows, serialRows, collectionRows] = await Promise.all([
    listIds.length === 0
      ? []
      : db
          .select({
            id: lists.id,
            slug: lists.slug,
            name: lists.name,
            listTypeNew: lists.listTypeNew,
            currency: lists.currency,
            profileSlug: lists.profileSlug,
            profileAddress: lists.profileAddress,
            nickname: userAddress.nickname,
          })
          .from(lists)
          .leftJoin(userAddress, eq(userAddress.address, lists.profileAddress))
          .where(inArray(lists.id, listIds)),
    objektIds.length === 0
      ? []
      : indexer
          .select({ id: objekts.id, serial: objekts.serial })
          .from(objekts)
          .where(inArray(objekts.id, objektIds)),
    fetchCollectionsBySlug(slugs, []),
  ]);

  const saleListIds = listRows.filter((l) => l.listTypeNew === "sale").map((l) => l.id);
  const entryRows =
    saleListIds.length === 0
      ? []
      : await db
          .select({
            listId: listEntries.listId,
            slug: listEntries.collectionSlug,
            objektId: listEntries.objektId,
            price: listEntries.price,
            isQyop: listEntries.isQyop,
          })
          .from(listEntries)
          .where(
            and(
              inArray(listEntries.listId, saleListIds),
              inArray(listEntries.collectionSlug, slugs),
            ),
          );

  const listById = new Map(listRows.map((row) => [row.id, row]));
  const serialOf = new Map(serialRows.map((row) => [row.id, row.serial]));

  const view = (card: StoredCard): CardView => {
    const list = card.listId === undefined ? undefined : listById.get(card.listId);
    const entry =
      list?.listTypeNew === "sale"
        ? entryRows.find(
            (e) =>
              e.listId === list.id &&
              e.slug === card.collectionSlug &&
              (card.objektId === undefined || e.objektId === card.objektId),
          )
        : undefined;
    return {
      collectionSlug: card.collectionSlug,
      objektId: card.objektId ?? null,
      serial: card.objektId === undefined ? null : (serialOf.get(card.objektId) ?? null),
      list: list
        ? {
            id: list.id,
            slug: list.slug,
            name: list.name,
            listTypeNew: list.listTypeNew,
            currency: list.currency,
            profileSlug: list.profileSlug,
            profile: list.profileAddress
              ? {
                  address: list.profileAddress.toLowerCase(),
                  nickname: list.nickname ?? null,
                }
              : null,
          }
        : null,
      price: entry && !entry.isQyop ? entry.price : null,
      isQyop: entry?.isQyop ?? false,
    };
  };

  return {
    view,
    serial: (objektId: string) => serialOf.get(objektId) ?? null,
    collections: Object.fromEntries(collectionRows.map((c) => [c.slug, c])) as Record<
      string,
      ValidObjekt
    >,
  };
}

type MessageRow = {
  id: number;
  senderId: string;
  body: string | null;
  card: unknown;
  createdAt: string;
  caution: string[] | null;
  offerId?: number | null;
  unsentAt?: string | null;
};

/** `limits` are the viewer's own, so an offer card offers only what the viewer may do. */
export async function toChatMessages(
  rows: MessageRow[],
  viewerId: string,
  limits: ActorLimits = {},
) {
  const cards = rows.map((row) => (row.unsentAt ? null : parseCard(row.card)));
  const offers = await fetchOffers(rows.flatMap((row) => (row.offerId ? [row.offerId] : [])));
  const {
    view,
    serial,
    collections: collectionMap,
  } = await hydrateCards([
    ...cards.filter((card): card is StoredCard => card !== null),
    ...offerItemCards(offers.values()),
  ]);
  const now = new Date();
  const messages: ChatMessage[] = rows.map((row, i) => {
    const card = cards[i] ?? null;
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
      card: card ? view(card) : null,
      createdAt: new Date(row.createdAt).toISOString(),
      // an offer's caution is its note's, shown on the offer card
      caution: row.senderId === viewerId || offer ? null : parseCaution(row.caution),
      offer: offer ? toOfferView(offer, viewerId, now, limits, serial) : null,
      unsent: false,
    };
  });
  return { messages, collections: collectionMap };
}
