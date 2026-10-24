import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, userAddress } from "@repo/db/schema";
import { isSerialEstimated, shownSerial } from "@repo/lib/serial";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray, sql } from "drizzle-orm";

import { cardAllowed, cardListAllowed, hidesSerials } from "../../lib/chat-rules";
import type { ActorLimits } from "../../lib/offer-rules";
import { unique } from "../../lib/unique";
import {
  type CardInput,
  type CardView,
  type ChatMessage,
  cardKinds,
  splitCards,
  isPostInput,
  MATCH_SLUGS,
  type ObjektCardInput,
  type PostCardInput,
  type PostCardView,
  parseCaution,
  type StoredCard,
  type StoredMatch,
  type StoredObjektCard,
  type StoredPostCard,
  storedCardSchema,
  unsentMessage,
} from "../../schemas/chat";
import type { ShownSerial } from "../../schemas/offer";
import { fetchCollectionsBySlug } from "../list";
import { fetchOffers, offerItemCards, toOfferView } from "../offer/view";
import { notTradeSanctioned } from "../safety";
import { fetchPostCards } from "../trade-feed";
import { takesPartInTrade } from "../trade-lists";
import { personDetail } from "../trade-matches";
import { refuse } from "./refuse";

type CardContext = { senderId: string; partnerId: string };

export type ResolvedCard =
  | { kind: "post"; input: PostCardInput; stored: StoredPostCard }
  | { kind: "objekt"; input: ObjektCardInput; stored: StoredObjektCard };

/** The card to store for `input`, or `invalid_card` when it can no longer be sent. */
export async function resolveCard(input: CardInput, context: CardContext): Promise<ResolvedCard> {
  return isPostInput(input)
    ? { kind: "post", input, stored: await resolvePostCard(input, context) }
    : { kind: "objekt", input, stored: await resolveObjektCard(input, context) };
}

/** A post is a list shown on Trade that the partner owns; a match is the server's, never the client's. */
async function resolvePostCard(
  input: PostCardInput,
  { senderId, partnerId }: CardContext,
): Promise<StoredPostCard> {
  const [list] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(
      and(
        eq(lists.slug, input.listSlug),
        eq(lists.userId, partnerId),
        eq(lists.discoverable, true),
        takesPartInTrade,
        notTradeSanctioned(sql`${lists.userId}`),
      ),
    );
  if (!list) refuse("invalid_card");
  const match = input.withMatch ? await savedMatch(senderId, partnerId) : null;
  return { kind: "post", listId: list.id, ...(match ? { match } : {}) };
}

/**
 * The overlap by the person sheet's rules and order: the owner's collections on the sender's
 * wants, then the sender's on the owner's, with the counts and the first three of each. Null
 * when there is none either way.
 */
async function savedMatch(senderId: string, ownerId: string): Promise<StoredMatch | null> {
  const { partner } = await personDetail(senderId, ownerId, undefined);
  if (!partner) return null;
  const side = (count: number, items: { slug: string }[]) => ({
    count,
    slugs: unique(items.map((item) => item.slug)).slice(0, MATCH_SLUGS),
  });
  const ownerHas = side(partner.counts.theyHave, partner.theyHaveIWant);
  const senderHas = side(partner.counts.youHave, partner.iHaveTheyWant);
  return ownerHas.count === 0 && senderHas.count === 0 ? null : { ownerHas, senderHas };
}

/**
 * An objekt only of the card's collection, and a list by `cardListAllowed`. A list must hold
 * the collection (and the objekt, unless it lists any copy), and a named objekt must be held by
 * the sender or the partner (`cardAllowed`).
 */
async function resolveObjektCard(
  input: ObjektCardInput,
  context: CardContext,
): Promise<StoredObjektCard> {
  const [list, collection, objekt] = await Promise.all([
    input.listSlug === undefined
      ? undefined
      : db
          .select({
            id: lists.id,
            ownerId: lists.userId,
            hideSerial: lists.hideSerial,
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
          .select({ collectionId: objekts.collectionId, owner: objekts.owner })
          .from(objekts)
          .where(eq(objekts.id, input.objektId))
          .then((rows) => rows[0] ?? null),
  ]);

  if (list === null || collection === null || objekt === null) refuse("invalid_card");
  if (list && !cardListAllowed(list, context.senderId, context.partnerId)) {
    refuse("invalid_card");
  }
  if (objekt && objekt.collectionId !== collection.id) refuse("invalid_card");

  const [entries, addressRows] = await Promise.all([
    list
      ? db
          .select({ objektId: listEntries.objektId })
          .from(listEntries)
          .where(
            and(
              eq(listEntries.listId, list.id),
              eq(listEntries.collectionSlug, input.collectionSlug),
            ),
          )
      : null,
    objekt
      ? db
          .select({
            address: userAddress.address,
          })
          .from(userAddress)
          .where(inArray(userAddress.userId, [context.senderId, context.partnerId]))
      : [],
  ]);
  const memberAddresses = addressRows.map((row) => row.address);
  if (
    !cardAllowed({
      entries,
      collectionOnly: hidesSerials(list, context.senderId),
      objektId: input.objektId,
      holder: objekt?.owner ?? null,
      memberAddresses,
    })
  ) {
    refuse("invalid_card");
  }

  return {
    collectionSlug: input.collectionSlug,
    ...(input.objektId === undefined ? {} : { objektId: input.objektId }),
    ...(list ? { listId: list.id } : {}),
  };
}

/** Either kind of card; for what is written to `message.card` and for the thread's own readers. */
export function parseCard(value: unknown): StoredCard | null {
  if (value === null) return null;
  const parsed = storedCardSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Read live, so a card follows its list's name and price and drops a deleted list. A list that
 * hides serials shows its objekt's id and serial, and prices it by collection, only to its owner.
 */
export async function hydrateCards(cards: StoredObjektCard[], viewerId: string | null) {
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
            ownerId: lists.userId,
            hideSerial: lists.hideSerial,
            slug: lists.slug,
            name: lists.name,
            listType: lists.listType,
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
          .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
          .from(objekts)
          .where(inArray(objekts.id, objektIds)),
    fetchCollectionsBySlug(slugs, []),
  ]);

  const saleListIds = listRows.filter((l) => l.listType === "sale").map((l) => l.id);
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
  const serialOf = new Map(serialRows.map((row) => [row.id, row]));

  const view = (card: StoredObjektCard): CardView => {
    const list = card.listId === undefined ? undefined : listById.get(card.listId);
    const hidden = hidesSerials(list, viewerId);
    const entry =
      list?.listType === "sale"
        ? entryRows.find(
            (e) =>
              e.listId === list.id &&
              e.slug === card.collectionSlug &&
              (hidden || card.objektId === undefined || e.objektId === card.objektId),
          )
        : undefined;
    return {
      collectionSlug: card.collectionSlug,
      objektId: hidden ? null : (card.objektId ?? null),
      serial:
        hidden || card.objektId === undefined
          ? null
          : (serialOf.get(card.objektId)?.serial ?? null),
      list: list
        ? {
            id: list.id,
            slug: list.slug,
            name: list.name,
            listType: list.listType,
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
    serial: (objektId: string): ShownSerial => {
      const row = serialOf.get(objektId);
      return row
        ? { serial: shownSerial(row.serial), estimated: isSerialEstimated(row.mintedAt) }
        : { serial: null, estimated: false };
    },
    collections: Object.fromEntries(collectionRows.map((c) => [c.slug, c])) as Record<
      string,
      ValidObjekt
    >,
  };
}

/**
 * Post cards read live, with the collections their strips and saved match draw. The saved
 * match is not read again: it shows what was true when the card was sent.
 */
export async function hydratePostCards(cards: StoredPostCard[], viewerId: string | null) {
  const posts = await fetchPostCards(unique(cards.map((card) => card.listId)), viewerId);
  const slugs = unique(
    cards.flatMap((card) => {
      const post = posts.get(card.listId);
      return [
        ...(post?.has?.slugs ?? []),
        ...(post?.wants?.slugs ?? []),
        ...(card.match?.ownerHas.slugs ?? []),
        ...(card.match?.senderHas.slugs ?? []),
      ];
    }),
  );
  const collectionRows = await fetchCollectionsBySlug(slugs, []);
  return {
    view: (card: StoredPostCard): PostCardView => ({
      listId: card.listId,
      post: posts.get(card.listId) ?? null,
      match: card.match ?? null,
    }),
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
  const split = splitCards(cards);
  const [objekts, posts] = await Promise.all([
    hydrateCards([...split.objekts, ...offerItemCards(offers.values())], viewerId),
    hydratePostCards(split.posts, viewerId),
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
      card: card.objekt ? view(card.objekt) : null,
      post: card.post ? posts.view(card.post) : null,
      createdAt: new Date(row.createdAt).toISOString(),
      // an offer's caution is its note's, shown on the offer card
      caution: row.senderId === viewerId || offer ? null : parseCaution(row.caution),
      offer: offer ? toOfferView(offer, viewerId, now, limits, serial) : null,
      unsent: false,
    };
  });
  const collectionMap = { ...objekts.collections, ...posts.collections };
  return { messages, collections: collectionMap };
}
