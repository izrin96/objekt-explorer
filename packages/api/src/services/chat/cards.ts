import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, userAddress } from "@repo/db/schema";
import { isSerialEstimated, shownSerial } from "@repo/lib/serial";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray } from "drizzle-orm";

import { hidesSerials } from "../../lib/chat-rules";
import { unique } from "../../lib/unique";
import {
  type CardView,
  type PostCardView,
  type StoredCard,
  type CardRef,
  type StoredPostCard,
  storedCardSchema,
} from "../../schemas/chat";
import type { ShownSerial } from "../../schemas/offer";
import { fetchCollectionsBySlug } from "../list/collections";
import { anchoredSerialIds } from "../objekt/serial-anchored";
import { fetchPostCards } from "../trade/feed/post-cards";

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
export async function hydrateCards(cards: CardRef[], viewerId: string | null) {
  const listIds = unique(cards.flatMap((card) => (card.listId === undefined ? [] : [card.listId])));
  const objektIds = unique(
    cards.flatMap((card) => (card.objektId === undefined ? [] : [card.objektId])),
  );
  const slugs = unique(cards.map((card) => card.collectionSlug));

  const [listRows, serialRows, collectionRows, anchored] = await Promise.all([
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
    anchoredSerialIds(objektIds),
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

  const view = (card: CardRef): CardView => {
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
      kind: "objekt",
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
        ? {
            serial: shownSerial(row.serial),
            estimated: isSerialEstimated(row.mintedAt, anchored.has(objektId)),
          }
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
      kind: "post",
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
