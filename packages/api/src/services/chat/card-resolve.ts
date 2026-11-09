import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, userAddress } from "@repo/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

import { cardAllowed, cardListAllowed, hidesSerials } from "../../lib/chat-rules";
import { unique } from "../../lib/unique";
import {
  type CardInput,
  isPostInput,
  MATCH_SLUGS,
  type ObjektCardInput,
  type PostCardInput,
  type StoredMatch,
  type StoredObjektCard,
  type StoredPostCard,
} from "../../schemas/chat";
import type { ListType } from "../../schemas/list";
import { mutualOf } from "../../schemas/trade";
import { notTradeSanctioned } from "../moderation/safety";
import { matchableList } from "../trade/lists";
import { personMatch } from "../trade/matches";
import { refuseChat } from "./refuse";

type CardContext = { senderId: string; partnerId: string };

/** The list a card names, for `firstListed`. */
type CardList = { ownerId: string; listType: ListType } | null;

export type ResolvedCard = { list: CardList } & (
  | { kind: "post"; input: PostCardInput; stored: StoredPostCard }
  | { kind: "objekt"; input: ObjektCardInput; stored: StoredObjektCard }
);

/** The card to store for `input`, or `invalid_card` when it can no longer be sent. */
export async function resolveCard(input: CardInput, context: CardContext): Promise<ResolvedCard> {
  return isPostInput(input)
    ? { kind: "post", input, ...(await resolvePostCard(input, context)) }
    : { kind: "objekt", input, ...(await resolveObjektCard(input, context)) };
}

/** A post is a list shown on Trade that the partner owns; a match is the server's, never the client's. */
async function resolvePostCard(
  input: PostCardInput,
  { senderId, partnerId }: CardContext,
): Promise<{ stored: StoredPostCard; list: CardList }> {
  const [list] = await db
    .select({ id: lists.id, listType: lists.listType })
    .from(lists)
    .where(
      and(
        eq(lists.slug, input.listSlug),
        eq(lists.userId, partnerId),
        eq(lists.discoverable, true),
        matchableList,
        notTradeSanctioned(sql`${lists.userId}`),
      ),
    );
  if (!list) refuseChat("invalid_card");
  const match = input.withMatch ? await savedMatch(senderId, partnerId) : null;
  return {
    stored: { kind: "post", listId: list.id, ...(match ? { match } : {}) },
    list: { ownerId: partnerId, listType: list.listType },
  };
}

/**
 * The overlap by the person sheet's rules and order: the owner's collections on the sender's
 * wants, then the sender's on the owner's, with the counts and the first three of each. Null
 * when there is none either way.
 */
async function savedMatch(senderId: string, ownerId: string): Promise<StoredMatch | null> {
  const partner = await personMatch(senderId, ownerId);
  if (!partner) return null;
  const side = (count: number, items: { slug: string }[]) => ({
    count,
    slugs: unique(items.map((item) => item.slug)).slice(0, MATCH_SLUGS),
  });
  const ownerHas = side(partner.counts.theyHave, partner.theyHaveIWant);
  const senderHas = side(partner.counts.youHave, partner.iHaveTheyWant);
  return ownerHas.count === 0 && senderHas.count === 0
    ? null
    : { ownerHas, senderHas, canSwap: mutualOf(partner.counts) > 0 };
}

/**
 * An objekt only of the card's collection, and a list by `cardListAllowed`. A list must hold
 * the collection (and the objekt, unless it lists any copy), and a named objekt must be held by
 * the sender or the partner (`cardAllowed`).
 */
async function resolveObjektCard(
  input: ObjektCardInput,
  context: CardContext,
): Promise<{ stored: StoredObjektCard; list: CardList }> {
  const [list, collection, objekt] = await Promise.all([
    input.listSlug === undefined
      ? undefined
      : db
          .select({
            id: lists.id,
            ownerId: lists.userId,
            listType: lists.listType,
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

  if (list === null || collection === null || objekt === null) refuseChat("invalid_card");
  if (list && !cardListAllowed(list, context.senderId, context.partnerId)) {
    refuseChat("invalid_card");
  }
  if (objekt && objekt.collectionId !== collection.id) refuseChat("invalid_card");

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
    refuseChat("invalid_card");
  }

  return {
    stored: {
      kind: "objekt",
      collectionSlug: input.collectionSlug,
      ...(input.objektId === undefined ? {} : { objektId: input.objektId }),
      ...(list ? { listId: list.id } : {}),
    },
    list: list ? { ownerId: list.ownerId, listType: list.listType } : null,
  };
}
