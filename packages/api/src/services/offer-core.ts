import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import {
  conversation,
  listEntries,
  lists,
  offer,
  offerItem,
  tradeLeg,
  userAddress,
} from "@repo/db/schema";
import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";

import { pairKey, startVerdict } from "../lib/chat-rules";
import { safetyRefusal } from "../lib/offer-rules";
import { addressesByUser } from "../lib/trade-rank";
import { type ChatRefusal, type ChatTarget } from "../schemas/chat";
import { type OfferRefusal } from "../schemas/offer";
import { type chatSafety, findMembership, prepareStart, type StartContext } from "./chat";
import { offersOnTrade } from "./trade-lists";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Safety = Awaited<ReturnType<typeof chatSafety>>;

export const unique = <T>(values: T[]) => [...new Set(values)];

const REFUSAL_STATUS: Record<OfferRefusal, ConstructorParameters<typeof ORPCError>[0]> = {
  empty: "BAD_REQUEST",
  too_many: "BAD_REQUEST",
  invalid_topup: "BAD_REQUEST",
  not_listed: "BAD_REQUEST",
  self: "BAD_REQUEST",
  not_owned: "CONFLICT",
  not_transferable: "CONFLICT",
  reserved: "CONFLICT",
  not_open: "CONFLICT",
  expired: "CONFLICT",
  trade_ended: "CONFLICT",
  locked: "CONFLICT",
  not_completed: "CONFLICT",
  rating_closed: "CONFLICT",
  not_allowed: "FORBIDDEN",
  trade_blocked: "FORBIDDEN",
  no_address: "FORBIDDEN",
  not_accepting: "FORBIDDEN",
  muted: "FORBIDDEN",
  too_many_open: "TOO_MANY_REQUESTS",
  start_limit: "TOO_MANY_REQUESTS",
  message_limit: "TOO_MANY_REQUESTS",
};

type RefusalDetail = { retryAt?: Date; objektIds?: string[]; collectionSlugs?: string[] };

export function refuseOffer(reason: OfferRefusal, detail: RefusalDetail = {}): never {
  throw new ORPCError(REFUSAL_STATUS[reason], {
    data: {
      reason,
      ...(detail.retryAt ? { retryAt: detail.retryAt.toISOString() } : {}),
      ...(detail.objektIds?.length ? { objektIds: detail.objektIds } : {}),
      ...(detail.collectionSlugs?.length ? { collectionSlugs: detail.collectionSlugs } : {}),
    },
  });
}

export function refuseUnsafe(kind: "send" | "accept" | "respond", safety: Safety) {
  const reason = safetyRefusal(kind, {
    blocked: safety.blocked,
    muted: safety.mute !== null,
    tradeBlocked: safety.tradeBlocked,
    partnerTradeBlocked: safety.partnerTradeBlocked,
  });
  if (reason === null) return;
  const until = reason === "muted" ? safety.mute?.until : null;
  refuseOffer(reason, until ? { retryAt: new Date(until) } : {});
}

/** Each user's linked addresses, lowercase. */
export async function linkedAddresses(userIds: string[]) {
  const rows =
    userIds.length === 0
      ? []
      : await db
          .select({ userId: userAddress.userId, address: userAddress.address })
          .from(userAddress)
          .where(inArray(userAddress.userId, unique(userIds)));
  const map = addressesByUser(rows);
  for (const id of userIds) if (!map.has(id)) map.set(id, new Set());
  return map;
}

export type IndexedObjekt = {
  id: string;
  owner: string;
  transferable: boolean;
  serial: number;
  slug: string;
  receivedAt: string;
};

export const objektColumns = {
  id: objekts.id,
  owner: objekts.owner,
  transferable: objekts.transferable,
  serial: objekts.serial,
  slug: collections.slug,
  receivedAt: objekts.receivedAt,
};

export const lowerOwner = (row: IndexedObjekt) =>
  Object.assign(row, { owner: row.owner.toLowerCase() });

export async function fetchObjekts(ids: string[]): Promise<Map<string, IndexedObjekt>> {
  if (ids.length === 0) return new Map();
  const rows = await indexer
    .select(objektColumns)
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(inArray(objekts.id, unique(ids)));
  return new Map(rows.map((row) => [row.id, lowerOwner(row)]));
}

/** Every copy of these collections the owners hold; bounded by the collections asked about. */
export async function fetchCopies(slugs: string[], owners: string[]): Promise<IndexedObjekt[]> {
  if (slugs.length === 0 || owners.length === 0) return [];
  const rows = await indexer
    .select(objektColumns)
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(and(inArray(collections.slug, unique(slugs)), inArray(objekts.owner, unique(owners))));
  return rows.map(lowerOwner);
}

export async function reservedIds(ids: string[], tx: Tx | typeof db = db) {
  if (ids.length === 0) return new Set<string>();
  const rows = await tx
    .select({ objektId: tradeLeg.objektId })
    .from(tradeLeg)
    .where(and(eq(tradeLeg.open, true), inArray(tradeLeg.objektId, unique(ids))));
  return new Set(rows.flatMap((row) => (row.objektId ? [row.objektId] : [])));
}

/**
 * Open any-copy legs per giver and collection: each one promises a copy, so it counts
 * against the copies a giver can offer again. Keyed by `copyKey`.
 */
export async function openAnyCopyLegs(
  givers: { userId: string; slugs: string[] }[],
  tx: Tx | typeof db = db,
) {
  const wanted = givers.filter((g) => g.slugs.length > 0);
  const counts = new Map<string, number>();
  if (wanted.length === 0) return counts;
  const rows = await tx
    .select({
      userId: tradeLeg.fromUserId,
      slug: tradeLeg.collectionSlug,
      n: sql<number>`count(*)::int`,
    })
    .from(tradeLeg)
    .where(
      and(
        eq(tradeLeg.open, true),
        isNull(tradeLeg.objektId),
        or(
          ...wanted.map((g) =>
            and(eq(tradeLeg.fromUserId, g.userId), inArray(tradeLeg.collectionSlug, g.slugs)),
          ),
        ),
      ),
    )
    .groupBy(tradeLeg.fromUserId, tradeLeg.collectionSlug);
  for (const row of rows) counts.set(copyKey(row.userId, row.slug), row.n);
  return counts;
}

export const copyKey = (userId: string, slug: string) => `${userId}:${slug}`;

/** Open, unexpired offers holding each objekt. */
export async function openOfferHolders(ids: string[]) {
  const map = new Map<string, { offerId: number; conversationId: number }[]>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({
      objektId: offerItem.objektId,
      offerId: offer.id,
      conversationId: offer.conversationId,
    })
    .from(offerItem)
    .innerJoin(offer, eq(offer.id, offerItem.offerId))
    .where(
      and(
        inArray(offerItem.objektId, unique(ids)),
        eq(offer.status, "open"),
        gt(offer.expiresAt, sql`now()`),
      ),
    );
  for (const row of rows) {
    if (!row.objektId) continue;
    map.set(row.objektId, [
      ...(map.get(row.objektId) ?? []),
      { offerId: row.offerId, conversationId: row.conversationId },
    ]);
  }
  return map;
}

export type Addressed = {
  partnerId: string;
  conversationId: number | null;
  /** set for a `target`: what a start needs, read once */
  start: StartContext | null;
};

/**
 * The partner and the conversation, if there is one yet, of a `conversationId` or a `target`.
 * A target with no conversation must pass the start verdict before anything of the partner's
 * is read, so the builder can't probe someone who doesn't accept messages.
 */
export async function resolveAddressed(
  me: string,
  meCreatedAt: Date,
  input: { conversationId?: number; target?: ChatTarget },
): Promise<Addressed> {
  if (input.conversationId !== undefined) {
    const { partnerId } = await findMembership(input.conversationId, me);
    return { partnerId, conversationId: input.conversationId, start: null };
  }
  const target = input.target!;
  const start = await prepareStart(me, meCreatedAt, target, new Date());
  const partnerId = start.recipientId;
  if (partnerId === me) refuseOffer("self");
  const { userLow, userHigh } = pairKey(me, partnerId);
  const [existing] = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
  const verdict = startVerdict({
    senderId: me,
    recipientId: partnerId,
    senderHasAddress: start.senderHasAddress,
    pref: start.pref,
    blocked: start.safety.blocked,
    senderMuted: start.safety.mute !== null,
    existing: existing !== undefined,
    // counted when the conversation is created, not on a read
    rate: { ok: true },
  });
  if (!verdict.ok) refuseOffer(verdict.reason as Exclude<ChatRefusal, "invalid_card">);
  return {
    partnerId,
    conversationId: existing?.id ?? null,
    start,
  };
}

export type AllowedEntry = {
  listId: number;
  listSlug: string;
  collectionSlug: string;
  objektId: string | null;
};

/** The partner's entries the sender may ask for: those on their bound have and sale lists. */
export async function allowedEntries(
  addressed: Addressed,
  slugs?: string[],
): Promise<AllowedEntry[]> {
  const allowed = await db
    .select({ id: lists.id, slug: lists.slug })
    .from(lists)
    .where(and(eq(lists.userId, addressed.partnerId), offersOnTrade));
  if (allowed.length === 0 || slugs?.length === 0) return [];

  const slugOf = new Map(allowed.map((list) => [list.id, list.slug]));
  const rows = await db
    .select({
      listId: listEntries.listId,
      collectionSlug: listEntries.collectionSlug,
      objektId: listEntries.objektId,
    })
    .from(listEntries)
    .where(
      and(
        inArray(listEntries.listId, [...slugOf.keys()]),
        slugs ? inArray(listEntries.collectionSlug, unique(slugs)) : undefined,
      ),
    )
    .orderBy(listEntries.listId, listEntries.id);
  return rows.flatMap((row) =>
    row.collectionSlug === null
      ? []
      : [
          {
            listId: row.listId,
            listSlug: slugOf.get(row.listId)!,
            collectionSlug: row.collectionSlug,
            objektId: row.objektId,
          },
        ],
  );
}
