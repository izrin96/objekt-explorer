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
import { type SQL, and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";

import { holdsMessage, pairKey, startFactsOf, startVerdict } from "../../lib/chat-rules";
import { type ListEntryRef, type OpenOfferHolder, safetyRefusal } from "../../lib/offer-rules";
import { addressesByUser } from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import { type ChatTarget } from "../../schemas/chat";
import { type OfferRefusal } from "../../schemas/offer";
import { type chatSafety, findMembership, prepareStart, type StartContext } from "../chat";
import { lockUsersShared } from "../cosmo-link";
import { notBlockedEither, notTradeSanctioned } from "../safety";
import { askableOnTrade } from "../trade-lists";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Safety = Awaited<ReturnType<typeof chatSafety>>;

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
  indexer_behind: "CONFLICT",
  substitute_closed: "CONFLICT",
  substitute_taken: "CONFLICT",
  not_completed: "CONFLICT",
  rating_closed: "CONFLICT",
  links_changed: "CONFLICT",
  not_allowed: "FORBIDDEN",
  not_receiver: "FORBIDDEN",
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

/**
 * Both parties' user rows `FOR SHARE`, which waits out a deletion's scrub; a deleted party is
 * refused as a block is, so nothing attaches to the account after its offers were cancelled.
 */
export async function lockParties(tx: Tx, ids: string[]) {
  const rows = await lockUsersShared(tx, ids);
  if (rows.some((row) => row.deleted_at !== null)) refuseOffer("not_accepting");
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

/**
 * `refuseUnsafe` again inside the transaction, after `lockParties`: a block or trade block that
 * committed after the pre-transaction read is applied. A sanction write locks the user row, so
 * it either committed before the share lock or waits behind this transaction. A mute is not
 * re-read: it only refuses a send, and one landing in this window is the same race a message
 * sent a moment earlier would win.
 */
export async function refuseUnsafeIn(
  tx: Tx,
  kind: "send" | "accept",
  me: string,
  partnerId: string,
) {
  const { rows } = await tx.execute<{
    blocked: boolean;
    trade_blocked: boolean;
    partner_trade_blocked: boolean;
  }>(sql`
    SELECT NOT ${notBlockedEither(me, partnerId)} AS blocked,
      NOT ${notTradeSanctioned(me)} AS trade_blocked,
      NOT ${notTradeSanctioned(partnerId)} AS partner_trade_blocked
  `);
  const row = rows[0];
  const reason = safetyRefusal(kind, {
    blocked: row?.blocked ?? false,
    muted: false,
    tradeBlocked: row?.trade_blocked ?? false,
    partnerTradeBlocked: row?.partner_trade_blocked ?? false,
  });
  if (reason !== null) refuseOffer(reason);
}

/** Each user's linked addresses, lowercase. */
export async function linkedAddresses(userIds: string[], executor: Pick<typeof db, "select"> = db) {
  const rows =
    userIds.length === 0
      ? []
      : await executor
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
  mintedAt: string;
  slug: string;
  receivedAt: string;
};

export const objektColumns = {
  id: objekts.id,
  owner: objekts.owner,
  transferable: objekts.transferable,
  serial: objekts.serial,
  mintedAt: objekts.mintedAt,
  slug: collections.slug,
  receivedAt: objekts.receivedAt,
};

export const lowerOwner = (row: IndexedObjekt) =>
  Object.assign(row, { owner: row.owner.toLowerCase() });

/** `narrow` is an extra condition on the objekt or its collection, such as a picker's filters. */
export async function fetchObjekts(
  ids: string[],
  narrow?: SQL,
): Promise<Map<string, IndexedObjekt>> {
  if (ids.length === 0) return new Map();
  const rows = await indexer
    .select(objektColumns)
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(and(inArray(objekts.id, unique(ids)), narrow));
  return new Map(rows.map((row) => [row.id, lowerOwner(row)]));
}

/** Every copy of these collections the owners hold; bounded by the collections asked about. */
export async function fetchCopies(
  slugs: string[],
  owners: string[],
  narrow?: SQL,
): Promise<IndexedObjekt[]> {
  if (slugs.length === 0 || owners.length === 0) return [];
  const rows = await indexer
    .select(objektColumns)
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(inArray(collections.slug, unique(slugs)), inArray(objekts.owner, unique(owners)), narrow),
    );
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

/** Open, unexpired offers holding each objekt, with their two parties. */
/** The open offers `me` is a party to that hold each of `ids`. */
export async function openOfferHolders(ids: string[], me: string) {
  const map = new Map<string, OpenOfferHolder[]>();
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
        or(eq(offer.fromUserId, me), eq(offer.toUserId, me)),
      ),
    );
  for (const row of rows) {
    if (!row.objektId) continue;
    const { objektId, ...holder } = row;
    map.set(objektId, [...(map.get(objektId) ?? []), holder]);
  }
  return map;
}

export type Addressed = {
  partnerId: string;
  conversationId: number | null;
  /** the conversation holds no message yet, so the offer is its first and its start */
  empty: boolean;
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
    const { partnerId, lastMessageId } = await findMembership(input.conversationId, me);
    return {
      partnerId,
      conversationId: input.conversationId,
      empty: !holdsMessage(lastMessageId),
      start: null,
    };
  }
  const target = input.target!;
  const start = await prepareStart(me, meCreatedAt, target, new Date());
  const partnerId = start.recipientId;
  if (partnerId === me) refuseOffer("self");
  const { userLow, userHigh } = pairKey(me, partnerId);
  const [existing] = await db
    .select({ id: conversation.id, lastMessageId: conversation.lastMessageId })
    .from(conversation)
    .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
  // the rate is counted when the conversation is created, not on a read
  const verdict = startVerdict(
    startFactsOf(start, holdsMessage(existing?.lastMessageId), { ok: true }),
  );
  if (!verdict.ok) refuseOffer(verdict.reason, verdict.retryAt ? { retryAt: verdict.retryAt } : {});
  return {
    partnerId,
    conversationId: existing?.id ?? null,
    empty: !holdsMessage(existing?.lastMessageId),
    start,
  };
}

export type AllowedEntry = ListEntryRef & { listId: number };

/** The partner's entries the sender may ask for: those on their have and sale lists on Trade. */
export async function allowedEntries(
  addressed: Addressed,
  slugs?: string[],
  fromList?: string,
): Promise<AllowedEntry[]> {
  const allowed = await db
    .select({ id: lists.id, slug: lists.slug, hideSerial: lists.hideSerial })
    .from(lists)
    .where(
      and(
        eq(lists.userId, addressed.partnerId),
        askableOnTrade,
        fromList === undefined ? undefined : eq(lists.slug, fromList),
      ),
    );
  if (allowed.length === 0 || slugs?.length === 0) return [];

  const listOf = new Map(allowed.map((list) => [list.id, list]));
  const rows = await db
    .select({
      listId: listEntries.listId,
      collectionSlug: listEntries.collectionSlug,
      objektId: listEntries.objektId,
    })
    .from(listEntries)
    .where(
      and(
        inArray(listEntries.listId, [...listOf.keys()]),
        slugs ? inArray(listEntries.collectionSlug, unique(slugs)) : undefined,
      ),
    )
    .orderBy(listEntries.listId, listEntries.id);
  return rows.flatMap((row) => {
    const list = listOf.get(row.listId)!;
    return row.collectionSlug === null
      ? []
      : [
          {
            listId: row.listId,
            listSlug: list.slug,
            collectionSlug: row.collectionSlug,
            objektId: row.objektId,
            hideSerial: list.hideSerial,
          },
        ];
  });
}

/** Whether the partner has a list the sender must ask through. */
export async function partnerHasLists(partnerId: string) {
  const rows = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.userId, partnerId), askableOnTrade))
    .limit(1);
  return rows.length > 0;
}

/** The partner's linked addresses, lowercase: where an offer from their collection may ask. */
export async function collectionAddresses(partnerId: string): Promise<string[]> {
  const rows = await db
    .select({ address: userAddress.address })
    .from(userAddress)
    .where(eq(userAddress.userId, partnerId));
  return rows.map((row) => row.address.toLowerCase());
}
