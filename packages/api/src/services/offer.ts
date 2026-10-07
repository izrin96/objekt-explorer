import { ORPCError } from "@orpc/server";
import { toIndexedArtist } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import {
  conversation,
  listEntries,
  lists,
  offer,
  offerItem,
  trade,
  tradeFeedback,
  tradeLeg,
  user,
  userAddress,
  userSanction,
} from "@repo/db/schema";
import { and, desc, eq, gt, gte, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";

import { cardListAllowed, pairKey, startVerdict } from "../lib/chat-rules";
import {
  type ActorLimits,
  actionRefusal,
  cancelRefusal,
  canReport,
  firstSender,
  rateRefusal,
  type TradeParty,
  anyCopyShortfall,
  createEffect,
  effectiveStatus,
  firstItemRefusal,
  itemFlags,
  itemVerdict,
  safetyRefusal,
  validateShape,
} from "../lib/offer-rules";
import { scanMessage } from "../lib/scam-patterns";
import type { ChatRefusal, ChatTarget, FlagCategory } from "../schemas/chat";
import type { CollectionFilters } from "../schemas/common/filters";
import {
  CANDIDATE_PAGE_SIZE,
  type CandidateItem,
  type CreateOfferInput,
  HISTORY_PAGE_SIZE,
  type HistoryCursor,
  type MineRow,
  OFFER_SIDE_LIMIT,
  type OfferAction,
  type OfferCancelReason,
  type OfferEvent,
  type OfferRefusal,
  type OfferStatus,
  OPEN_OFFER_LIMIT,
  type TradeCancelReason,
  RATE_WINDOW_DAYS,
  type TradeRating,
  type TradeStatus,
  type TradeView,
  VERIFIER_LAST_KEY,
} from "../schemas/offer";
import { publishNotify } from "../user-socket";
import {
  appendMessage,
  chatSafety,
  checkMessageRate,
  checkStart,
  ensureConversation,
  fetchPartners,
  fetchPref,
  findMembership,
  hydrateCards,
  prepareStart,
  publishChatChanged,
  type StartContext,
} from "./chat";
import { getUsdRates } from "./currency-rates";
import { fetchCollectionsBySlug } from "./list";
import { partyNames, writeNotes } from "./offer-notes";
import { fetchOffers, iso, itemViews, offerItemCards, toOfferView, topupView } from "./offer-view";
import { redis } from "./redis";
import { forgetReputation, reputationOf } from "./reputation";
import { activeSanctionWhere } from "./safety";
import { resolveTradeSides } from "./trade-matches";
import { loadOpenLegs, matchOpenLegs } from "./trade-verify";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Safety = Awaited<ReturnType<typeof chatSafety>>;

const unique = <T>(values: T[]) => [...new Set(values)];

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
  hidden_owner: "FORBIDDEN",
  muted: "FORBIDDEN",
  too_many_open: "TOO_MANY_REQUESTS",
  start_limit: "TOO_MANY_REQUESTS",
  message_limit: "TOO_MANY_REQUESTS",
};

type RefusalDetail = { retryAt?: Date; objektIds?: string[]; collectionSlugs?: string[] };

function refuseOffer(reason: OfferRefusal, detail: RefusalDetail = {}): never {
  throw new ORPCError(REFUSAL_STATUS[reason], {
    data: {
      reason,
      ...(detail.retryAt ? { retryAt: detail.retryAt.toISOString() } : {}),
      ...(detail.objektIds?.length ? { objektIds: detail.objektIds } : {}),
      ...(detail.collectionSlugs?.length ? { collectionSlugs: detail.collectionSlugs } : {}),
    },
  });
}

function refuseUnsafe(kind: "send" | "accept" | "respond", safety: Safety) {
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
 * Each user's linked addresses, lowercase. `visibleOnly` keeps the ones that show their owner:
 * naming a token held at a Hide User address would tie that address to the account.
 */
async function linkedAddresses(userIds: string[], visibleOnly = false) {
  const rows =
    userIds.length === 0
      ? []
      : await db
          .select({ userId: userAddress.userId, address: userAddress.address })
          .from(userAddress)
          .where(
            and(
              inArray(userAddress.userId, unique(userIds)),
              visibleOnly ? eq(userAddress.hideUser, false) : undefined,
            ),
          );
  const map = new Map<string, Set<string>>(userIds.map((id) => [id, new Set<string>()]));
  for (const row of rows) {
    if (row.userId) map.get(row.userId)?.add(row.address.toLowerCase());
  }
  return map;
}

type IndexedObjekt = {
  id: string;
  owner: string;
  transferable: boolean;
  serial: number;
  slug: string;
  receivedAt: string;
};

const objektColumns = {
  id: objekts.id,
  owner: objekts.owner,
  transferable: objekts.transferable,
  serial: objekts.serial,
  slug: collections.slug,
  receivedAt: objekts.receivedAt,
};

const lowerOwner = (row: IndexedObjekt) => Object.assign(row, { owner: row.owner.toLowerCase() });

async function fetchObjekts(ids: string[]): Promise<Map<string, IndexedObjekt>> {
  if (ids.length === 0) return new Map();
  const rows = await indexer
    .select(objektColumns)
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(inArray(objekts.id, unique(ids)));
  return new Map(rows.map((row) => [row.id, lowerOwner(row)]));
}

/** Every copy of these collections the owners hold; bounded by the collections asked about. */
async function fetchCopies(slugs: string[], owners: string[]): Promise<IndexedObjekt[]> {
  if (slugs.length === 0 || owners.length === 0) return [];
  const rows = await indexer
    .select(objektColumns)
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(and(inArray(collections.slug, unique(slugs)), inArray(objekts.owner, unique(owners))));
  return rows.map(lowerOwner);
}

async function reservedIds(ids: string[], tx: Tx | typeof db = db) {
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
async function openAnyCopyLegs(
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

const copyKey = (userId: string, slug: string) => `${userId}:${slug}`;

/** Open, unexpired offers holding each objekt. */
async function openOfferHolders(ids: string[]) {
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

type Addressed = {
  partnerId: string;
  conversationId: number | null;
  targetListSlug: string | null;
  /** set for a `target`: what a start needs, read once */
  start: StartContext | null;
};

/**
 * The partner and the conversation, if there is one yet, of a `conversationId` or a `target`.
 * A target with no conversation must pass the start verdict before anything of the partner's
 * is read, so the builder can't probe someone who doesn't accept messages.
 */
async function resolveAddressed(
  me: string,
  meCreatedAt: Date,
  input: { conversationId?: number; target?: ChatTarget },
): Promise<Addressed> {
  if (input.conversationId !== undefined) {
    const { partnerId } = await findMembership(input.conversationId, me);
    return { partnerId, conversationId: input.conversationId, targetListSlug: null, start: null };
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
  if (!existing) {
    const verdict = startVerdict({
      senderId: me,
      recipientId: partnerId,
      senderHasAddress: start.senderHasAddress,
      pref: start.pref,
      hidesOwner: start.hidesOwner,
      blocked: start.safety.blocked,
      senderMuted: start.safety.mute !== null,
      existing: false,
      // counted when the conversation is created, not on a read
      rate: { ok: true },
    });
    if (!verdict.ok) refuseOffer(verdict.reason as Exclude<ChatRefusal, "invalid_card">);
  }
  return {
    partnerId,
    conversationId: existing?.id ?? null,
    targetListSlug: target.kind === "list" ? target.slug : null,
    start,
  };
}

type AllowedEntry = {
  listId: number;
  listSlug: string;
  collectionSlug: string;
  objektId: string | null;
};

/**
 * The partner's have and sale entries the sender may ask for: lists that show their owner,
 * the list being started from, and lists already named in the conversation, on a card or
 * on an earlier offer (an offer started from a hidden list leaves no card).
 */
async function allowedEntries(
  me: string,
  addressed: Addressed,
  slugs?: string[],
): Promise<AllowedEntry[]> {
  const { partnerId, conversationId, targetListSlug } = addressed;
  const [partnerLists, carded] = await Promise.all([
    db
      .select({ id: lists.id, slug: lists.slug, hideUser: lists.hideUser })
      .from(lists)
      .where(and(eq(lists.userId, partnerId), inArray(lists.listTypeNew, ["have", "sale"]))),
    conversationId === null
      ? { rows: [] }
      : db.execute<{ list_id: number }>(sql`
          SELECT DISTINCT (card->>'listId')::int AS list_id FROM message
          WHERE conversation_id = ${conversationId} AND card ? 'listId'
          UNION
          SELECT DISTINCT i.list_id FROM offer_item i
          JOIN offer o ON o.id = i.offer_id
          WHERE o.conversation_id = ${conversationId} AND i.list_id IS NOT NULL
        `),
  ]);
  const cardIds = new Set(carded.rows.map((row) => row.list_id));
  const allowed = partnerLists.filter(
    (list) =>
      cardIds.has(list.id) ||
      cardListAllowed({ ownerId: partnerId, ...list }, me, partnerId, targetListSlug),
  );
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

type GetItem = { collectionSlug: string; objektId?: string; listSlug?: string };

/** The entry a get item comes from: its own token, else a collection entry; the named list first. */
function matchEntry(item: GetItem, entries: AllowedEntry[]) {
  const fits = (entry: AllowedEntry) =>
    entry.collectionSlug === item.collectionSlug &&
    (entry.objektId === null || (item.objektId !== undefined && entry.objektId === item.objektId));
  const candidates = entries.filter(fits);
  return candidates.find((entry) => entry.listSlug === item.listSlug) ?? candidates[0] ?? null;
}

function toCandidate(
  objekt: IndexedObjekt,
  flags: ReturnType<typeof itemFlags>,
  listSlug: string | null,
): CandidateItem {
  return {
    collectionSlug: objekt.slug,
    objektId: objekt.id,
    serial: objekt.serial,
    ...flags,
    listSlug,
    copies: null,
  };
}

async function collectionsOf(slugs: string[]) {
  const rows = await fetchCollectionsBySlug(unique(slugs), []);
  return Object.fromEntries(rows.map((row) => [row.slug, row]));
}

function collectionWhere(filters: Partial<CollectionFilters> | undefined) {
  if (!filters) return [];
  return [
    filters.artist?.length
      ? inArray(collections.artist, filters.artist.map(toIndexedArtist))
      : undefined,
    filters.member?.length ? inArray(collections.member, filters.member) : undefined,
    filters.season?.length ? inArray(collections.season, filters.season) : undefined,
    filters.class?.length ? inArray(collections.class, filters.class) : undefined,
    filters.on_offline?.length ? inArray(collections.onOffline, filters.on_offline) : undefined,
    filters.collection?.length ? inArray(collections.collectionNo, filters.collection) : undefined,
  ];
}

/** The sender's own objekts, newest received first; on the first page, their have-list objekts too. */
async function mineCandidates(
  me: string,
  addressed: Addressed,
  cursor: { receivedAt: string; id: string } | undefined,
  filters: Partial<CollectionFilters> | undefined,
) {
  const addresses = [...((await linkedAddresses([me])).get(me) ?? [])];
  if (addresses.length === 0) {
    return { items: [], suggested: [], nextCursor: null, collections: {} };
  }

  const [rows, haveEntries] = await Promise.all([
    indexer
      .select(objektColumns)
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          inArray(objekts.owner, addresses),
          ne(collections.slug, "empty-collection"),
          ...collectionWhere(filters),
          cursor
            ? or(
                lt(objekts.receivedAt, cursor.receivedAt),
                and(eq(objekts.receivedAt, cursor.receivedAt), lt(objekts.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(objekts.receivedAt), desc(objekts.id))
      .limit(CANDIDATE_PAGE_SIZE + 1),
    cursor
      ? []
      : db
          .select({
            listSlug: lists.slug,
            collectionSlug: listEntries.collectionSlug,
            objektId: listEntries.objektId,
          })
          .from(listEntries)
          .innerJoin(lists, eq(lists.id, listEntries.listId))
          .where(and(eq(lists.userId, me), eq(lists.listTypeNew, "have")))
          .orderBy(listEntries.id),
  ]);

  const page = rows.slice(0, CANDIDATE_PAGE_SIZE).map(lowerOwner);
  const mine = new Set(addresses);
  const [haveTokens, haveCopies] = await Promise.all([
    fetchObjekts(haveEntries.flatMap((e) => (e.objektId ? [e.objektId] : []))),
    fetchCopies(
      haveEntries.flatMap((e) =>
        e.objektId === null && e.collectionSlug ? [e.collectionSlug] : [],
      ),
      addresses,
    ),
  ]);

  const suggestedObjekts = new Map<string, { objekt: IndexedObjekt; listSlug: string }>();
  for (const entry of haveEntries) {
    const owned = entry.objektId
      ? [haveTokens.get(entry.objektId)].filter((o) => o !== undefined && mine.has(o.owner))
      : haveCopies.filter((o) => o.slug === entry.collectionSlug);
    for (const objekt of owned) {
      if (!suggestedObjekts.has(objekt!.id)) {
        suggestedObjekts.set(objekt!.id, { objekt: objekt!, listSlug: entry.listSlug });
      }
    }
  }
  const suggestedList = [...suggestedObjekts.values()].slice(0, CANDIDATE_PAGE_SIZE);

  const ids = unique([...page.map((o) => o.id), ...suggestedList.map((s) => s.objekt.id)]);
  const [reserved, holders] = await Promise.all([reservedIds(ids), openOfferHolders(ids)]);
  const flags = (objekt: IndexedObjekt) =>
    itemFlags(objekt, reserved, holders, addressed.conversationId);
  const suggestionOf = new Map(suggestedList.map((s) => [s.objekt.id, s.listSlug]));

  const last = page.at(-1);
  return {
    items: page.map((objekt) =>
      toCandidate(objekt, flags(objekt), suggestionOf.get(objekt.id) ?? null),
    ),
    suggested: suggestedList.map(({ objekt, listSlug }) =>
      toCandidate(objekt, flags(objekt), listSlug),
    ),
    nextCursor:
      rows.length > CANDIDATE_PAGE_SIZE && last
        ? { receivedAt: new Date(last.receivedAt).toISOString(), id: last.id }
        : null,
    collections: await collectionsOf(
      [...page, ...suggestedList.map((s) => s.objekt)].map((o) => o.slug),
    ),
  };
}

/**
 * The specific objekts the open offer sent to `me` in this conversation gives. A counter may
 * keep them on its get side: the partner put them up, so they need no list.
 */
async function counteredGives(conversationId: number | null, me: string) {
  if (conversationId === null) return null;
  const rows = await db
    .select({ offerId: offer.id, objektId: offerItem.objektId, slug: offerItem.collectionSlug })
    .from(offer)
    .innerJoin(offerItem, and(eq(offerItem.offerId, offer.id), eq(offerItem.side, "give")))
    .where(
      and(
        eq(offer.conversationId, conversationId),
        eq(offer.status, "open"),
        eq(offer.toUserId, me),
        gt(offer.expiresAt, sql`now()`),
      ),
    );
  if (rows.length === 0) return null;
  return {
    offerId: rows[0]!.offerId,
    objekts: new Map(rows.flatMap((row) => (row.objektId ? [[row.objektId, row.slug]] : []))),
  };
}

/** The allowed list entries resolved against the partner's current wallet. */
async function theirCandidates(me: string, addressed: Addressed) {
  const { partnerId } = addressed;
  const [entries, all, visible, kept] = await Promise.all([
    allowedEntries(me, addressed),
    linkedAddresses([partnerId]),
    linkedAddresses([partnerId], true),
    counteredGives(addressed.conversationId, me),
  ]);
  const keptIds = [...(kept?.objekts.keys() ?? [])];
  const addresses = [...(all.get(partnerId) ?? [])];
  const theirs = visible.get(partnerId) ?? new Set<string>();
  const anySlugs = unique(entries.flatMap((e) => (e.objektId === null ? [e.collectionSlug] : [])));

  const [tokens, copies, promised] = await Promise.all([
    fetchObjekts([...entries.flatMap((e) => (e.objektId ? [e.objektId] : [])), ...keptIds]),
    fetchCopies(anySlugs, addresses),
    openAnyCopyLegs([{ userId: partnerId, slugs: anySlugs }]),
  ]);
  const ids = unique([...tokens.keys(), ...copies.map((o) => o.id)]);
  const [reserved, holders] = await Promise.all([reservedIds(ids), openOfferHolders(ids)]);
  const flags = (objekt: IndexedObjekt) =>
    itemFlags(objekt, reserved, holders, addressed.conversationId);

  const items: CandidateItem[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.objektId !== null) {
      const objekt = tokens.get(entry.objektId);
      if (!objekt || !theirs.has(objekt.owner) || objekt.slug !== entry.collectionSlug) continue;
      if (seen.has(objekt.id)) continue;
      seen.add(objekt.id);
      items.push(toCandidate(objekt, flags(objekt), entry.listSlug));
      continue;
    }
    const held = copies.filter((o) => o.slug === entry.collectionSlug);
    // the count may include Hide User addresses; their token ids are never returned
    const spare =
      held.filter((o) => o.transferable && !reserved.has(o.id)).length -
      (promised.get(copyKey(partnerId, entry.collectionSlug)) ?? 0);
    const anyKey = `any:${entry.collectionSlug}`;
    if (spare > 0 && !seen.has(anyKey)) {
      seen.add(anyKey);
      items.push({
        collectionSlug: entry.collectionSlug,
        objektId: null,
        serial: null,
        transferable: true,
        reserved: false,
        inOpenOffer: [],
        listSlug: entry.listSlug,
        copies: spare,
      });
    }
    for (const objekt of held) {
      if (seen.has(objekt.id) || !theirs.has(objekt.owner)) continue;
      seen.add(objekt.id);
      items.push(toCandidate(objekt, flags(objekt), entry.listSlug));
    }
  }

  // what the countered offer gave, still with the partner: it showed these, at any address
  const allOf = new Set(addresses);
  for (const id of keptIds) {
    const objekt = tokens.get(id);
    if (!objekt || seen.has(id) || !allOf.has(objekt.owner)) continue;
    seen.add(id);
    items.push(toCandidate(objekt, flags(objekt), null));
  }

  return {
    items,
    suggested: [],
    nextCursor: null,
    collections: await collectionsOf(items.map((item) => item.collectionSlug)),
  };
}

export async function offerCandidates(
  me: string,
  meCreatedAt: Date,
  input: {
    conversationId?: number;
    target?: ChatTarget;
    side: "mine" | "theirs";
    cursor?: { receivedAt: string; id: string };
    filters?: Partial<CollectionFilters>;
  },
) {
  const addressed = await resolveAddressed(me, meCreatedAt, input);
  // however the partner was named: a target can resolve to an existing conversation, which
  // skips the start verdict
  if (input.side === "theirs") {
    const safety = addressed.start?.safety ?? (await chatSafety(me, addressed.partnerId));
    if (safety.blocked || safety.partnerTradeBlocked) refuseOffer("not_accepting");
  }
  return input.side === "mine"
    ? mineCandidates(me, addressed, input.cursor, input.filters)
    : theirCandidates(me, addressed);
}

type OfferRow = {
  id: number;
  conversationId: number;
  fromUserId: string;
  toUserId: string;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
};

const offerRowColumns = {
  id: offer.id,
  conversationId: offer.conversationId,
  fromUserId: offer.fromUserId,
  toUserId: offer.toUserId,
  status: sql<OfferStatus>`${offer.status}`,
  expiresAt: offer.expiresAt,
  createdAt: offer.createdAt,
};

/** NOT_FOUND unless the viewer is one of the offer's two parties. */
async function findOffer(offerId: number, me: string): Promise<OfferRow> {
  const [row] = await db
    .select(offerRowColumns)
    .from(offer)
    .where(and(eq(offer.id, offerId), or(eq(offer.fromUserId, me), eq(offer.toUserId, me))));
  if (!row) throw new ORPCError("NOT_FOUND");
  return row;
}

async function lockConversation(tx: Tx, conversationId: number) {
  await tx
    .select({ id: conversation.id })
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .for("update");
}

const refuseAction = (
  row: OfferRow,
  me: string,
  action: OfferAction,
  now: Date,
  limits: ActorLimits = {},
) => {
  const reason = actionRefusal(row, me, action, now, limits);
  if (reason) refuseOffer(reason);
};

type Side = "give" | "get";
type ItemRow = { side: Side; collectionSlug: string; objektId: string | null };

type ItemParties = {
  giverId: (side: Side) => string;
  /** where a side's specific objekts may sit; `objektId` lets one objekt widen it */
  holders: (side: Side, objektId?: string) => ReadonlySet<string>;
  /** where a side's any-copy copies are counted */
  copyHolders: (side: Side) => ReadonlySet<string>;
  /**
   * Accept only: a specific objekt the giver already sent to the receiver after the offer
   * was made counts as held, so an early sender doesn't sink their own trade.
   */
  sent?: { since: string; receivers: (side: Side) => ReadonlySet<string> };
};

/** Specific objekts that went from the side's giver to its receiver at or after `since`. */
async function sentEarly(items: ItemRow[], parties: ItemParties) {
  const sent = new Set<string>();
  if (!parties.sent || items.length === 0) return sent;
  const { since, receivers } = parties.sent;
  const rows = await Promise.all(
    (["give", "get"] as const).map((side) => {
      const ids = items.filter((i) => i.side === side).map((i) => i.objektId!);
      const from = [...parties.holders(side)];
      const to = [...receivers(side)];
      if (ids.length === 0 || from.length === 0 || to.length === 0) return Promise.resolve([]);
      return indexer
        .select({ objektId: transfers.objektId })
        .from(transfers)
        .where(
          and(
            inArray(transfers.objektId, ids),
            inArray(transfers.from, from),
            inArray(transfers.to, to),
            gte(transfers.timestamp, since),
          ),
        );
    }),
  );
  for (const row of rows.flat()) if (row.objektId) sent.add(row.objektId);
  return sent;
}

type CopyNeed = { side: Side; giverId: string; available: Map<string, number> };

/**
 * Specific objekts must sit with the side that gives them, transferable and unreserved;
 * any-copy items need as many such copies, beyond the ones named and the ones already
 * promised to open any-copy legs, as the offer asks for. Returns the copies counted before
 * the promised ones, so accept can recheck those under its lock.
 */
async function checkItems(
  items: ItemRow[],
  parties: ItemParties,
  tx: Tx | typeof db = db,
): Promise<CopyNeed[]> {
  const specific = items.filter((item) => item.objektId !== null);
  const anyCopy = items.filter((item) => item.objektId === null);
  const slugsOf = (side: Side) =>
    unique(anyCopy.filter((item) => item.side === side).map((item) => item.collectionSlug));
  const [found, copies] = await Promise.all([
    fetchObjekts(specific.map((item) => item.objektId!)),
    Promise.all(
      (["give", "get"] as const).map((side) =>
        fetchCopies(slugsOf(side), [...parties.copyHolders(side)]),
      ),
    ),
  ]);
  const reserved = await reservedIds(
    [...specific.map((item) => item.objektId!), ...copies.flat().map((o) => o.id)],
    tx,
  );
  const elsewhere = specific.filter((item) => {
    const owner = found.get(item.objektId!)?.owner;
    return owner !== undefined && parties.sent?.receivers(item.side).has(owner);
  });
  const early = await sentEarly(elsewhere, parties);

  const refusal = firstItemRefusal(
    specific.map((item) => {
      const objekt = found.get(item.objektId!);
      const valid = objekt && objekt.slug === item.collectionSlug ? objekt : undefined;
      return {
        objektId: item.objektId!,
        verdict: early.has(item.objektId!)
          ? "ok"
          : itemVerdict(
              valid,
              parties.holders(item.side, item.objektId!),
              reserved.has(item.objektId!),
            ),
      };
    }),
  );
  if (refusal) refuseOffer(refusal.reason, { objektIds: refusal.objektIds });

  const named = new Set(specific.map((item) => item.objektId!));
  const needs = (["give", "get"] as const).map((side, i): CopyNeed => {
    const available = new Map<string, number>();
    for (const copy of copies[i]!) {
      if (!copy.transferable || reserved.has(copy.id) || named.has(copy.id)) continue;
      available.set(copy.slug, (available.get(copy.slug) ?? 0) + 1);
    }
    return { side, giverId: parties.giverId(side), available };
  });
  await refuseCopyShortfall(anyCopy, needs, tx);
  return needs;
}

async function refuseCopyShortfall(anyCopy: ItemRow[], needs: CopyNeed[], tx: Tx | typeof db) {
  if (anyCopy.length === 0) return;
  const promised = await openAnyCopyLegs(
    needs.map((need) => ({
      userId: need.giverId,
      slugs: unique(anyCopy.filter((i) => i.side === need.side).map((i) => i.collectionSlug)),
    })),
    tx,
  );
  const short = needs.flatMap((need) => {
    const left = new Map(
      [...need.available].map(([slug, n]) => [
        slug,
        n - (promised.get(copyKey(need.giverId, slug)) ?? 0),
      ]),
    );
    return anyCopyShortfall(
      anyCopy.filter((item) => item.side === need.side),
      left,
    );
  });
  if (short.length > 0) refuseOffer("not_owned", { collectionSlugs: unique(short) });
}

export async function createOffer(
  me: string,
  meCreatedAt: Date,
  input: CreateOfferInput,
): Promise<{
  offerId: number;
  conversationId: number;
  created: boolean;
  warnings: { objektId: string; offerIds: number[] }[];
}> {
  const now = new Date();
  const rates = await getUsdRates();
  const shape = validateShape(input, new Set(Object.keys(rates)));
  if (!shape.ok) refuseOffer(shape.reason);

  const addressed = await resolveAddressed(me, meCreatedAt, input);
  const { partnerId } = addressed;
  const startCtx = addressed.start;
  const [safety, addresses, visible] = await Promise.all([
    startCtx ? startCtx.safety : chatSafety(me, partnerId),
    linkedAddresses([me, partnerId]),
    linkedAddresses([partnerId], true),
  ]);
  const myAddresses = addresses.get(me)!;
  if (myAddresses.size === 0) refuseOffer("no_address");
  refuseUnsafe("send", safety);

  const [entries, kept] = await Promise.all([
    allowedEntries(
      me,
      addressed,
      input.get.map((item) => item.collectionSlug),
    ),
    counteredGives(addressed.conversationId, me),
  ]);
  const getRows = input.get.map((item) => {
    const entry = matchEntry(item, entries);
    if (entry) return { item, listId: entry.listId, kept: false };
    const keeps =
      item.objektId !== undefined && kept?.objekts.get(item.objektId) === item.collectionSlug;
    if (!keeps) refuseOffer("not_listed", item.objektId ? { objektIds: [item.objektId] } : {});
    return { item, listId: null, kept: true };
  });
  const keptIds = new Set(getRows.flatMap((row) => (row.kept ? [row.item.objektId!] : [])));

  const items: ItemRow[] = [
    ...input.give.map((item) => ({
      side: "give" as const,
      collectionSlug: item.collectionSlug,
      objektId: item.objektId,
    })),
    ...input.get.map((item) => ({
      side: "get" as const,
      collectionSlug: item.collectionSlug,
      objektId: item.objektId ?? null,
    })),
  ];
  await checkItems(items, {
    giverId: (side) => (side === "give" ? me : partnerId),
    holders: (side, objektId) =>
      side === "give"
        ? myAddresses
        : objektId !== undefined && keptIds.has(objektId)
          ? addresses.get(partnerId)!
          : visible.get(partnerId)!,
    copyHolders: (side) => (side === "give" ? myAddresses : addresses.get(partnerId)!),
  });

  const specificIds = items.flatMap((item) => (item.objektId ? [item.objektId] : []));
  const holders = await openOfferHolders(specificIds);
  const warnings = specificIds.flatMap((objektId) => {
    const offerIds = (holders.get(objektId) ?? [])
      .filter((h) => h.conversationId !== addressed.conversationId)
      .map((h) => h.offerId);
    return offerIds.length > 0 ? [{ objektId, offerIds }] : [];
  });

  await checkMessageRate(me, now);
  const note = input.note ? input.note : null;
  const caution: FlagCategory[] = note === null ? [] : scanMessage(note);
  const name = await partyNames([me, partnerId]);

  const result = await db.transaction(async (tx) => {
    let conversationId: number;
    let created = false;
    if (startCtx) {
      const existingId = await checkStart(tx, startCtx);
      ({ id: conversationId, created } = await ensureConversation(tx, startCtx, existingId, true));
    } else {
      conversationId = addressed.conversationId!;
    }
    await lockConversation(tx, conversationId);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('offer_open'), hashtext(${me}))`);

    const [current] = await tx
      .select(offerRowColumns)
      .from(offer)
      .where(and(eq(offer.conversationId, conversationId), eq(offer.status, "open")));
    let open: OfferRow | null = current ?? null;
    if (open && effectiveStatus(open, now) === "expired") {
      await tx.update(offer).set({ status: "expired" }).where(eq(offer.id, open.id));
      open = null;
    }
    const effect = createEffect(open, me);
    // kept objekts ride on countering that very offer; anything else lists them again
    if (keptIds.size > 0 && (effect !== "counter" || open?.id !== kept?.offerId)) {
      refuseOffer("not_listed", { objektIds: [...keptIds] });
    }

    const openSent = await tx.$count(
      offer,
      and(
        eq(offer.fromUserId, me),
        eq(offer.status, "open"),
        gt(offer.expiresAt, sql`now()`),
        effect === "replace" ? ne(offer.id, open!.id) : undefined,
      ),
    );
    if (openSent >= OPEN_OFFER_LIMIT) refuseOffer("too_many_open");

    if (open && effect !== "new") {
      await tx
        .update(offer)
        .set({
          status: effect === "counter" ? "countered" : "withdrawn",
          respondedAt: sql`now()`,
        })
        .where(eq(offer.id, open.id));
    }

    const [inserted] = await tx
      .insert(offer)
      .values({
        conversationId,
        fromUserId: me,
        toUserId: partnerId,
        parentId: effect === "counter" ? open!.id : null,
        topupAmount: shape.topup?.amount ?? null,
        topupCurrency: shape.topup?.currency ?? null,
        topupPayer: shape.topup?.payer ?? null,
        note,
        caution: caution.length ? caution : null,
      })
      .returning({ id: offer.id });
    const offerId = inserted!.id;

    await tx.insert(offerItem).values([
      ...input.give.map((item) => ({
        offerId,
        side: "give",
        collectionSlug: item.collectionSlug,
        objektId: item.objektId,
      })),
      ...getRows.map(({ item, listId }) => ({
        offerId,
        side: "get",
        collectionSlug: item.collectionSlug,
        objektId: item.objektId ?? null,
        listId,
      })),
    ]);
    await appendMessage(tx, conversationId, me, null, null, caution, offerId);

    const notified = await writeNotes(tx, [
      {
        type: "offer",
        userId: partnerId,
        payload: {
          offerId,
          conversationId,
          tradeId: null,
          event: effect === "counter" ? "countered" : "received",
          reason: null,
          partner: name(me),
        },
      },
    ]);
    return { offerId, conversationId, created, notified };
  });

  await publishChatChanged([me, partnerId], result.conversationId);
  await Promise.all(result.notified.map((userId) => publishNotify(userId)));
  return {
    offerId: result.offerId,
    conversationId: result.conversationId,
    created: result.created,
    warnings,
  };
}

function reservedConflict(error: unknown): string[] | null {
  let cause: unknown = error;
  while (cause instanceof Error) {
    const pg = cause as Error & { code?: string; constraint?: string; detail?: string };
    if (pg.code === "23505" && pg.constraint === "trade_leg_reserved") {
      const match = pg.detail?.match(/=\((.+)\)/);
      return match ? [match[1]!] : [];
    }
    // two accepts reserving shared objekts can still wait on each other's other legs
    if (pg.code === "40P01") return [];
    cause = cause.cause;
  }
  return null;
}

/** The pair's chat and both members' bells hear about every offer a change touched. */
async function publishTouched(
  conversations: { conversationId: number; userIds: string[] }[],
  notified: string[],
) {
  await Promise.all([
    ...conversations.map((c) => publishChatChanged(c.userIds, c.conversationId)),
    ...unique(notified).map((userId) => publishNotify(userId)),
  ]);
}

export async function acceptOffer(me: string, offerId: number) {
  const now = new Date();
  const row = await findOffer(offerId, me);
  const partnerId = row.fromUserId === me ? row.toUserId : row.fromUserId;
  const safety = await chatSafety(me, partnerId);
  refuseAction(row, me, "accept", now, { tradeBlocked: safety.tradeBlocked });
  refuseUnsafe("accept", safety);

  const [items, addresses] = await Promise.all([
    db
      .select({
        side: sql<"give" | "get">`${offerItem.side}`,
        collectionSlug: offerItem.collectionSlug,
        objektId: offerItem.objektId,
      })
      .from(offerItem)
      .where(eq(offerItem.offerId, offerId))
      .orderBy(offerItem.id),
    linkedAddresses([row.fromUserId, row.toUserId]),
  ]);
  const fromAddresses = addresses.get(row.fromUserId)!;
  const toAddresses = addresses.get(row.toUserId)!;
  if (toAddresses.size === 0 || fromAddresses.size === 0) refuseOffer("no_address");
  const holdersOf = (side: Side) => (side === "give" ? fromAddresses : toAddresses);
  // read before the lock: the indexer is another database, and a token that moves after
  // this read is caught by the verifier
  const copyNeeds = await checkItems(items, {
    giverId: (side) => (side === "give" ? row.fromUserId : row.toUserId),
    holders: holdersOf,
    copyHolders: holdersOf,
    sent: {
      since: row.createdAt,
      receivers: (side) => (side === "give" ? toAddresses : fromAddresses),
    },
  });
  const anyCopy = items.filter((item) => item.objektId === null);
  const name = await partyNames([row.fromUserId, row.toUserId]);

  const result = await db.transaction(async (tx) => {
    await lockConversation(tx, row.conversationId);
    const [fresh] = await tx.select(offerRowColumns).from(offer).where(eq(offer.id, offerId));
    refuseAction(fresh!, me, "accept", now);

    // any-copy legs reserve no token, so a giver's copies are counted under a lock per giver,
    // taken in id order
    const givers = unique(
      anyCopy.map((item) => (item.side === "give" ? row.fromUserId : row.toUserId)),
    ).toSorted();
    for (const giverId of givers) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('any_copy'), hashtext(${giverId}))`,
      );
    }
    await refuseCopyShortfall(anyCopy, copyNeeds, tx);

    const [created] = await tx
      .insert(trade)
      .values({ offerId, userA: row.fromUserId, userB: row.toUserId })
      .returning({ id: trade.id });
    const tradeId = created!.id;

    const snapshot = (addresses: ReadonlySet<string>) => [...addresses].toSorted();
    try {
      // a fixed order, so two accepts over the same objekts wait instead of deadlocking
      const ordered = items.toSorted((a, b) =>
        a.objektId === b.objektId
          ? 0
          : a.objektId === null
            ? 1
            : b.objektId === null
              ? -1
              : a.objektId < b.objektId
                ? -1
                : 1,
      );
      await tx.insert(tradeLeg).values(
        ordered.map((item) => {
          const fromSender = item.side === "give";
          return {
            tradeId,
            fromUserId: fromSender ? row.fromUserId : row.toUserId,
            toUserId: fromSender ? row.toUserId : row.fromUserId,
            fromAddresses: snapshot(fromSender ? fromAddresses : toAddresses),
            toAddresses: snapshot(fromSender ? toAddresses : fromAddresses),
            collectionSlug: item.collectionSlug,
            objektId: item.objektId,
          };
        }),
      );
    } catch (error) {
      const taken = reservedConflict(error);
      if (taken === null) throw error;
      refuseOffer("reserved", { objektIds: taken });
    }

    const accepted = await tx
      .update(offer)
      .set({ status: "accepted", respondedAt: sql`now()` })
      .where(and(eq(offer.id, offerId), eq(offer.status, "open")))
      .returning({ id: offer.id });
    if (accepted.length === 0) refuseOffer("not_open");

    const specificIds = items.flatMap((item) => (item.objektId ? [item.objektId] : []));
    const cancelled =
      specificIds.length === 0
        ? []
        : await tx
            .update(offer)
            .set({ status: "cancelled", cancelReason: "reserved", respondedAt: sql`now()` })
            .where(
              and(
                eq(offer.status, "open"),
                ne(offer.id, offerId),
                gt(offer.expiresAt, sql`now()`),
                inArray(
                  offer.id,
                  tx
                    .select({ id: offerItem.offerId })
                    .from(offerItem)
                    .where(inArray(offerItem.objektId, specificIds)),
                ),
              ),
            )
            .returning({
              id: offer.id,
              conversationId: offer.conversationId,
              fromUserId: offer.fromUserId,
              toUserId: offer.toUserId,
            });

    const others = cancelled.length
      ? await partyNames(cancelled.flatMap((o) => [o.fromUserId, o.toUserId]))
      : name;
    const notified = await writeNotes(tx, [
      {
        type: "offer",
        userId: row.fromUserId,
        payload: {
          offerId,
          conversationId: row.conversationId,
          tradeId,
          event: "accepted",
          reason: null,
          partner: name(row.toUserId),
        },
      },
      ...cancelled.flatMap((o) =>
        [
          [o.fromUserId, o.toUserId],
          [o.toUserId, o.fromUserId],
        ].map(([userId, other]) => ({
          type: "offer" as const,
          userId: userId!,
          payload: {
            offerId: o.id,
            conversationId: o.conversationId,
            tradeId: null,
            event: "cancelled" as const,
            reason: "reserved" as const,
            partner: others(other!),
          },
        })),
      ),
    ]);
    return { tradeId, cancelled, notified };
  });

  await publishTouched(
    [
      { conversationId: row.conversationId, userIds: [row.fromUserId, row.toUserId] },
      ...result.cancelled.map((o) => ({
        conversationId: o.conversationId,
        userIds: [o.fromUserId, o.toUserId],
      })),
    ],
    result.notified,
  );
  return { tradeId: result.tradeId };
}

/** Decline (the recipient) or withdraw (the sender); `respondedAt` marks when. */
export async function respondToOffer(me: string, offerId: number, action: "decline" | "withdraw") {
  const now = new Date();
  const row = await findOffer(offerId, me);
  const partnerId = row.fromUserId === me ? row.toUserId : row.fromUserId;
  const safety = await chatSafety(me, partnerId);
  refuseAction(row, me, action, now, { tradeBlocked: safety.tradeBlocked });
  const name = await partyNames([me]);

  const notified = await db.transaction(async (tx) => {
    await lockConversation(tx, row.conversationId);
    const updated = await tx
      .update(offer)
      .set({
        status: action === "decline" ? "declined" : "withdrawn",
        respondedAt: sql`now()`,
      })
      .where(and(eq(offer.id, offerId), eq(offer.status, "open"), gt(offer.expiresAt, sql`now()`)))
      .returning({ id: offer.id });
    if (updated.length === 0) {
      const [fresh] = await tx.select(offerRowColumns).from(offer).where(eq(offer.id, offerId));
      refuseAction(fresh!, me, action, new Date());
      refuseOffer("not_open");
    }
    return writeNotes(tx, [
      {
        type: "offer",
        userId: partnerId,
        payload: {
          offerId,
          conversationId: row.conversationId,
          tradeId: null,
          event: action === "decline" ? "declined" : "withdrawn",
          reason: null,
          partner: name(me),
        },
      },
    ]);
  });

  await publishTouched(
    [{ conversationId: row.conversationId, userIds: [me, partnerId] }],
    notified,
  );
}

/**
 * Cancels every open offer matching `where` with `reason`, notifying both parties of each,
 * inside the caller's transaction; the caller publishes the result after commit.
 */
export async function cancelOpenOffers(
  tx: Tx,
  where: ReturnType<typeof and>,
  reason: OfferCancelReason,
) {
  const cancelled = await tx
    .update(offer)
    .set({ status: "cancelled", cancelReason: reason, respondedAt: sql`now()` })
    .where(and(eq(offer.status, "open"), gt(offer.expiresAt, sql`now()`), where))
    .returning({
      id: offer.id,
      conversationId: offer.conversationId,
      fromUserId: offer.fromUserId,
      toUserId: offer.toUserId,
    });
  if (cancelled.length === 0) return { conversations: [], notified: [] };
  const name = await partyNames(cancelled.flatMap((o) => [o.fromUserId, o.toUserId]));
  const notified = await writeNotes(
    tx,
    cancelled.flatMap((o) =>
      [
        [o.fromUserId, o.toUserId],
        [o.toUserId, o.fromUserId],
      ].map(([userId, other]) => ({
        type: "offer" as const,
        userId: userId!,
        payload: {
          offerId: o.id,
          conversationId: o.conversationId,
          tradeId: null,
          event: "cancelled" as OfferEvent,
          reason,
          partner: name(other!),
        },
      })),
    ),
  );
  return {
    conversations: cancelled.map((o) => ({
      conversationId: o.conversationId,
      userIds: [o.fromUserId, o.toUserId],
    })),
    notified,
  };
}

export type CancelResult = Awaited<ReturnType<typeof cancelOpenOffers>>;

export const offersBetween = (a: string, b: string) =>
  or(
    and(eq(offer.fromUserId, a), eq(offer.toUserId, b)),
    and(eq(offer.fromUserId, b), eq(offer.toUserId, a)),
  );

export const offersOf = (userId: string) =>
  or(eq(offer.fromUserId, userId), eq(offer.toUserId, userId));

export async function publishCancelled(result: CancelResult) {
  await publishTouched(result.conversations, result.notified);
}

const tradeColumns = {
  id: trade.id,
  offerId: trade.offerId,
  userA: trade.userA,
  userB: trade.userB,
  status: sql<TradeStatus>`${trade.status}`,
  cancelReason: sql<TradeCancelReason | null>`${trade.cancelReason}`,
  cancelledBy: trade.cancelledBy,
  acceptedAt: trade.acceptedAt,
  endedAt: trade.endedAt,
};

/** NOT_FOUND unless the viewer is one of the trade's two parties. */
async function findTrade(tradeId: number, me: string) {
  const [row] = await db
    .select({ ...tradeColumns, conversationId: offer.conversationId })
    .from(trade)
    .innerJoin(offer, eq(offer.id, trade.offerId))
    .where(and(eq(trade.id, tradeId), or(eq(trade.userA, me), eq(trade.userB, me))));
  if (!row) throw new ORPCError("NOT_FOUND");
  return { ...row, partnerId: row.userA === me ? row.userB : row.userA };
}

const countVerified = (tx: Tx, tradeId: number) =>
  tx
    .select({
      total: sql<number>`count(*)::int`,
      verified: sql<number>`(count(*) FILTER (WHERE ${tradeLeg.verifiedAt} IS NOT NULL))::int`,
    })
    .from(tradeLeg)
    .where(eq(tradeLeg.tradeId, tradeId))
    .then((rows) => rows[0] ?? { total: 0, verified: 0 });

export async function cancelTrade(me: string, tradeId: number) {
  const row = await findTrade(tradeId, me);
  const { partnerId } = row;
  const safety = await chatSafety(me, partnerId);
  if (safety.tradeBlocked) refuseOffer("trade_blocked");
  // a transfer the verifier hasn't run on yet locks the trade too, or a party could send
  // nothing back and cancel right after receiving
  const legs = await loadOpenLegs(tradeId);
  if (legs.length > 0) {
    const results = await matchOpenLegs(legs);
    if ([...results.values()].some((result) => result.kind === "verified")) refuseOffer("locked");
  }
  const name = await partyNames([me]);

  const notified = await db.transaction(async (tx) => {
    // the verifier settles a trade under this same lock, so a leg it verifies is seen here
    const [locked] = await tx
      .select({ status: sql<TradeStatus>`${trade.status}` })
      .from(trade)
      .where(eq(trade.id, tradeId))
      .for("update");
    const counts = await countVerified(tx, tradeId);
    const refusal = cancelRefusal({
      status: locked!.status,
      acceptedAt: row.acceptedAt,
      endedAt: row.endedAt,
      verifiedLegs: counts.verified,
    });
    if (refusal) refuseOffer(refusal);

    await tx
      .update(trade)
      .set({ status: "cancelled", endedAt: sql`now()`, cancelledBy: me, cancelReason: "party" })
      .where(eq(trade.id, tradeId));
    await tx.update(tradeLeg).set({ open: false }).where(eq(tradeLeg.tradeId, tradeId));
    return writeNotes(tx, [
      {
        type: "trade",
        userId: partnerId,
        payload: {
          tradeId,
          offerId: row.offerId,
          conversationId: row.conversationId,
          event: "cancelled",
          reason: "party",
          progress: counts,
          partner: name(me),
        },
      },
    ]);
  });

  await publishTouched(
    [{ conversationId: row.conversationId, userIds: [me, partnerId] }],
    notified,
  );
}

/** Feedback on a completed trade, changeable for 14 days; only totals are ever shown. */
export async function rateTrade(me: string, tradeId: number, rating: TradeRating) {
  const row = await findTrade(tradeId, me);
  const safety = await chatSafety(me, row.partnerId);
  if (safety.tradeBlocked) refuseOffer("trade_blocked");
  const refusal = rateRefusal({ ...row, verifiedLegs: 0 }, new Date());
  if (refusal) refuseOffer(refusal);

  await db
    .insert(tradeFeedback)
    .values({ tradeId, fromUserId: me, toUserId: row.partnerId, rating })
    .onConflictDoUpdate({
      target: [tradeFeedback.tradeId, tradeFeedback.fromUserId],
      set: { rating, updatedAt: sql`now()` },
    });
  await forgetReputation([me, row.partnerId]);
  return { rating };
}

const RATE_WINDOW_MS = RATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * The suggested first sender among the parties who give a leg: with both giving, by
 * `firstSender`; `sent` when every leg they give is verified.
 */
function suggestFirstSender(
  row: { userA: string; userB: string },
  legs: { fromUserId: string; verifiedAt: string | null }[],
  parties: Map<string, TradeParty>,
) {
  const givers = [row.userA, row.userB].filter((id) => legs.some((leg) => leg.fromUserId === id));
  if (givers.length === 0) return null;
  const userId =
    givers.length === 1
      ? givers[0]!
      : firstSender(parties.get(row.userA)!, parties.get(row.userB)!);
  const theirs = legs.filter((leg) => leg.fromUserId === userId);
  return { userId, sent: theirs.every((leg) => leg.verifiedAt !== null) };
}

export async function fetchTrade(me: string, tradeId: number) {
  const now = new Date();
  const row = await findTrade(tradeId, me);
  const { partnerId } = row;

  const [offers, legs, partners, reputations, accounts, [feedback], lastChecked] =
    await Promise.all([
      fetchOffers([row.offerId]),
      db.select().from(tradeLeg).where(eq(tradeLeg.tradeId, tradeId)).orderBy(tradeLeg.id),
      fetchPartners([partnerId]),
      reputationOf([row.userA, row.userB]),
      db
        .select({ id: user.id, createdAt: user.createdAt })
        .from(user)
        .where(inArray(user.id, [row.userA, row.userB])),
      db
        .select({ rating: sql<TradeRating>`${tradeFeedback.rating}` })
        .from(tradeFeedback)
        .where(and(eq(tradeFeedback.tradeId, tradeId), eq(tradeFeedback.fromUserId, me))),
      redis.get(VERIFIER_LAST_KEY),
    ]);
  const source = offers.get(row.offerId)!;
  const partner = partners.get(partnerId);
  if (!partner) throw new ORPCError("NOT_FOUND");
  const { serial: serialOf, collections } = await hydrateCards(
    legs.map((leg) =>
      leg.objektId === null
        ? { collectionSlug: leg.collectionSlug }
        : { collectionSlug: leg.collectionSlug, objektId: leg.objektId },
    ),
  );

  const verified = legs.filter((leg) => leg.verifiedAt !== null).length;
  const state = { ...row, verifiedLegs: verified };
  const createdAt = new Map(accounts.map((a) => [a.id, a.createdAt]));
  const party = (id: string): TradeParty => ({
    userId: id,
    verified: reputations.get(id)?.verified ?? 0,
    createdAt: createdAt.get(id) ?? new Date(0),
  });
  const first =
    row.status === "in_progress"
      ? suggestFirstSender(row, legs, new Map([row.userA, row.userB].map((id) => [id, party(id)])))
      : null;
  const cancel = cancelRefusal(state);

  const result: TradeView = {
    id: row.id,
    offerId: row.offerId,
    conversationId: source.conversation_id,
    partner: { ...partner, reputation: reputations.get(partnerId) ?? null },
    status: row.status,
    cancelReason: row.cancelReason,
    cancelledByYou: row.cancelledBy === null ? null : row.cancelledBy === me,
    proposedAt: iso(source.created_at)!,
    acceptedAt: iso(row.acceptedAt)!,
    endedAt: iso(row.endedAt),
    topup: topupView(source, source.from_user_id === me),
    note: source.note,
    legs: legs.map((leg) => ({
      id: leg.id,
      collectionSlug: leg.collectionSlug,
      objektId: leg.objektId,
      serial: leg.objektId === null ? null : serialOf(leg.objektId),
      fromYou: leg.fromUserId === me,
      open: leg.open,
      state: leg.verifiedAt !== null ? "verified" : leg.open ? "waiting" : "closed",
      verifiedAt: iso(leg.verifiedAt),
      txHash: leg.txHash,
      verifiedObjektId: leg.verifiedObjektId,
    })),
    progress: { verified, total: legs.length },
    firstSender: first && { userId: first.userId, you: first.userId === me, sent: first.sent },
    canCancel: cancel === null,
    cancelLocked: cancel === "locked",
    canReport: canReport(state, now),
    rating: feedback?.rating ?? null,
    canRate: rateRefusal(state, now) === null,
    rateUntil:
      row.status === "completed" && row.endedAt
        ? new Date(new Date(row.endedAt).getTime() + RATE_WINDOW_MS).toISOString()
        : null,
    lastCheckedAt: lastChecked,
  };
  return { trade: result, collections };
}

type MineEntry = {
  kind: "offer" | "trade";
  id: number;
  offerId: number;
  status: string;
  cancelReason: string | null;
  at: string;
};

type HistoryRow = {
  kind: "offer" | "trade";
  id: number;
  offer_id: number;
  status: string;
  cancel_reason: string | null;
  at: string;
};

const GROUP_LIMIT = 100;

/** Needs you, Waiting on them and In progress on the first page; History paged by `cursor`. */
export async function fetchMine(me: string, cursor: HistoryCursor | undefined) {
  const now = new Date();
  const groupsQuery = cursor
    ? null
    : Promise.all([
        db
          .select({
            id: offer.id,
            toUserId: offer.toUserId,
            at: sql<string>`${offer.createdAt}::text`,
          })
          .from(offer)
          .where(and(offersOf(me), eq(offer.status, "open"), gt(offer.expiresAt, sql`now()`)))
          .orderBy(desc(offer.createdAt))
          .limit(GROUP_LIMIT * 2),
        db
          .select({
            id: trade.id,
            offerId: trade.offerId,
            at: sql<string>`${trade.acceptedAt}::text`,
          })
          .from(trade)
          .where(and(or(eq(trade.userA, me), eq(trade.userB, me)), eq(trade.status, "in_progress")))
          .orderBy(desc(trade.acceptedAt))
          .limit(GROUP_LIMIT),
      ]);

  const history = await db.execute<HistoryRow>(sql`
    SELECT * FROM (
      SELECT 'offer' AS kind, o.id, o.id AS offer_id,
        CASE WHEN o.status = 'open' THEN 'expired' ELSE o.status END AS status,
        o.cancel_reason,
        (CASE WHEN o.status IN ('open', 'expired') THEN o.expires_at ELSE coalesce(o.responded_at, o.created_at) END)::text AS at
      FROM offer o
      WHERE (o.from_user_id = ${me} OR o.to_user_id = ${me})
        AND (o.status IN ('declined', 'withdrawn', 'countered', 'cancelled', 'expired')
          OR (o.status = 'open' AND o.expires_at <= now()))
      UNION ALL
      SELECT 'trade', t.id, t.offer_id, t.status, t.cancel_reason,
        coalesce(t.ended_at, t.accepted_at)::text
      FROM trade t
      WHERE (t.user_a = ${me} OR t.user_b = ${me}) AND t.status <> 'in_progress'
    ) h
    ${cursor ? sql`WHERE (h.at::timestamptz, h.kind, h.id) < (${cursor.at}::timestamptz, ${cursor.kind}, ${cursor.id})` : sql``}
    ORDER BY h.at::timestamptz DESC, h.kind DESC, h.id DESC
    LIMIT ${HISTORY_PAGE_SIZE + 1}
  `);

  const groups = groupsQuery ? await groupsQuery : null;
  const historyPage: MineEntry[] = history.rows.slice(0, HISTORY_PAGE_SIZE).map((row) => ({
    kind: row.kind,
    id: row.id,
    offerId: row.offer_id,
    status: row.status,
    cancelReason: row.cancel_reason,
    at: row.at,
  }));
  const openOffers = groups?.[0] ?? [];
  const inProgress: MineEntry[] = (groups?.[1] ?? []).map((t) => ({
    kind: "trade",
    id: t.id,
    offerId: t.offerId,
    status: "in_progress",
    cancelReason: null,
    at: t.at,
  }));
  const toEntry = (o: (typeof openOffers)[number]): MineEntry => ({
    kind: "offer",
    id: o.id,
    offerId: o.id,
    status: "open",
    cancelReason: null,
    at: o.at,
  });
  const needsYou = openOffers
    .filter((o) => o.toUserId === me)
    .slice(0, GROUP_LIMIT)
    .map(toEntry);
  const waiting = openOffers
    .filter((o) => o.toUserId !== me)
    .slice(0, GROUP_LIMIT)
    .map(toEntry);

  const all = [...needsYou, ...waiting, ...inProgress, ...historyPage];
  const offers = await fetchOffers(all.map((entry) => entry.offerId));
  const [partners, { serial: serialOf, collections }] = await Promise.all([
    fetchPartners(
      [...offers.values()].map((o) => (o.from_user_id === me ? o.to_user_id : o.from_user_id)),
    ),
    hydrateCards(offerItemCards(offers.values())),
  ]);
  const toRow = (entry: MineEntry): MineRow[] => {
    const source = offers.get(entry.offerId);
    if (!source) return [];
    const partner = partners.get(
      source.from_user_id === me ? source.to_user_id : source.from_user_id,
    );
    if (!partner) return [];
    return [
      {
        kind: entry.kind,
        id: entry.id,
        offerId: entry.offerId,
        tradeId: entry.kind === "trade" ? entry.id : source.trade_id,
        conversationId: source.conversation_id,
        partner,
        status: entry.status as MineRow["status"],
        cancelReason: entry.cancelReason as MineRow["cancelReason"],
        yourTurn: entry.kind === "offer" && entry.status === "open" && source.to_user_id === me,
        ...itemViews(source, me, serialOf),
        topup: topupView(source, source.from_user_id === me),
        at: new Date(entry.at).toISOString(),
      },
    ];
  };

  const last = history.rows.length > HISTORY_PAGE_SIZE ? historyPage.at(-1) : undefined;
  return {
    groups: groups
      ? {
          needsYou: needsYou.flatMap(toRow),
          waiting: waiting.flatMap(toRow),
          inProgress: inProgress.flatMap(toRow),
        }
      : null,
    history: {
      items: historyPage.flatMap(toRow),
      nextCursor: last ? { at: last.at, kind: last.kind, id: last.id } : null,
    },
    collections,
    now: now.toISOString(),
  };
}

/** For you's overlap with one partner, as items that can be offered right now. */
export async function suggestOffer(me: string, partnerId: string) {
  if (partnerId === me) refuseOffer("self");
  const empty = { give: [] as CandidateItem[], get: [] as CandidateItem[], collections: {} };
  const safety = await chatSafety(me, partnerId);
  if (safety.blocked || safety.tradeBlocked || safety.partnerTradeBlocked) return empty;

  const sides = await resolveTradeSides(me, undefined);
  const { userLow, userHigh } = pairKey(me, partnerId);
  const [myEntries, partnerWants, existing] = await Promise.all([
    db
      .select({
        listId: listEntries.listId,
        listSlug: lists.slug,
        collectionSlug: listEntries.collectionSlug,
        objektId: listEntries.objektId,
      })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(inArray(listEntries.listId, [...sides.haveListIds, ...sides.wantListIds]))
      .orderBy(listEntries.id),
    db
      .selectDistinct({ collectionSlug: listEntries.collectionSlug })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(
        and(
          eq(lists.userId, partnerId),
          eq(lists.listTypeNew, "want"),
          eq(lists.discoverable, true),
        ),
      ),
    db
      .select({ id: conversation.id })
      .from(conversation)
      .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh))),
  ]);
  const haveIds = new Set(sides.haveListIds);
  const myWantSlugs = unique(
    myEntries.flatMap((e) =>
      !haveIds.has(e.listId) && e.collectionSlug ? [e.collectionSlug] : [],
    ),
  );
  const theyWant = new Set(
    partnerWants.flatMap((w) => (w.collectionSlug ? [w.collectionSlug] : [])),
  );
  // with no conversation yet, someone who accepts no messages is not read at all
  if (!existing[0] && (await fetchPref(partnerId)).allow === "nobody") return empty;
  const addressed: Addressed = {
    partnerId,
    conversationId: existing[0]?.id ?? null,
    targetListSlug: null,
    start: null,
  };

  const [theirs, mine] = await Promise.all([
    myWantSlugs.length === 0 ? null : theirCandidates(me, addressed),
    (async () => {
      const giveEntries = myEntries.filter(
        (e) => haveIds.has(e.listId) && e.collectionSlug && theyWant.has(e.collectionSlug),
      );
      const addresses = [...((await linkedAddresses([me])).get(me) ?? [])];
      const [tokens, copies] = await Promise.all([
        fetchObjekts(giveEntries.flatMap((e) => (e.objektId ? [e.objektId] : []))),
        fetchCopies(
          giveEntries.flatMap((e) => (e.objektId === null ? [e.collectionSlug!] : [])),
          addresses,
        ),
      ]);
      const ids = [...tokens.keys(), ...copies.map((c) => c.id)];
      const [reserved, holders] = await Promise.all([reservedIds(ids), openOfferHolders(ids)]);
      const owned = new Set(addresses);
      const picked = new Map<string, CandidateItem>();
      const offerable = (o: IndexedObjekt) =>
        owned.has(o.owner) && o.transferable && !reserved.has(o.id) && !picked.has(o.id);
      for (const entry of giveEntries) {
        const choice = entry.objektId
          ? [tokens.get(entry.objektId)].find(
              (o) => o && o.slug === entry.collectionSlug && offerable(o),
            )
          : copies.find((o) => o.slug === entry.collectionSlug && offerable(o));
        if (!choice) continue;
        picked.set(
          choice.id,
          toCandidate(
            choice,
            itemFlags(choice, reserved, holders, addressed.conversationId),
            entry.listSlug,
          ),
        );
      }
      return [...picked.values()];
    })(),
  ]);

  const wanted = new Set(myWantSlugs);
  const get = (theirs?.items ?? []).filter(
    (item) => wanted.has(item.collectionSlug) && item.transferable && !item.reserved,
  );
  // one item per wanted collection: any copy where offered, else the first specific one
  const bySlug = new Map<string, CandidateItem>();
  for (const item of get) {
    const current = bySlug.get(item.collectionSlug);
    if (!current || (item.objektId === null && current.objektId !== null)) {
      bySlug.set(item.collectionSlug, item);
    }
  }
  const give = mine.slice(0, OFFER_SIDE_LIMIT);
  const getItems = [...bySlug.values()].slice(0, OFFER_SIDE_LIMIT);
  return {
    give,
    get: getItems,
    collections: await collectionsOf([...give, ...getItems].map((item) => item.collectionSlug)),
  };
}

/** The viewer's own sanctions that change which actions an offer card offers. */
async function actorLimits(me: string): Promise<ActorLimits> {
  const rows = await db
    .select({ type: userSanction.type })
    .from(userSanction)
    .where(
      and(
        eq(userSanction.userId, me),
        inArray(userSanction.type, ["chat_mute", "trade_block", "ban"]),
        activeSanctionWhere,
      ),
    );
  return {
    muted: rows.some((row) => row.type === "chat_mute"),
    tradeBlocked: rows.some((row) => row.type === "trade_block" || row.type === "ban"),
  };
}

/**
 * Live offer cards for a thread, without refetching its messages: the offers among `ids`
 * the viewer is a party to, others dropped silently. Hydrated as the thread hydrates them.
 */
export async function offerViews(me: string, ids: number[]) {
  const [found, limits] = await Promise.all([fetchOffers(ids), actorLimits(me)]);
  const mine = [...found.values()].filter(
    (row) => row.from_user_id === me || row.to_user_id === me,
  );
  const { serial, collections } = await hydrateCards(offerItemCards(mine));
  const now = new Date();
  return {
    offers: mine.map((row) => toOfferView(row, me, now, limits, serial)),
    collections,
  };
}
