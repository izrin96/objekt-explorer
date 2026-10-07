import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import {
  conversation,
  conversationMember,
  listEntries,
  lists,
  message,
  messageFlag,
  messagePref,
  user,
  userAddress,
  userSanction,
} from "@repo/db/schema";
import { bumpTradeVersion } from "@repo/lib/server/list-touch";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, asc, eq, gt, inArray, or, sql } from "drizzle-orm";

import {
  type ChatAddress,
  chatIdentity,
  type MemberEvent,
  type MemberState,
  type MessagePref,
  cardListAllowed,
  MESSAGE_WINDOW_MS,
  messageRateDecision,
  nextMemberState,
  toMessagePref,
  pairKey,
  rateDecision,
  startMembers,
  startVerdict,
} from "../lib/chat-rules";
import type { ActorLimits } from "../lib/offer-rules";
import { effectiveSanction } from "../lib/sanctions";
import {
  type CardInput,
  type CardView,
  type ChatMessage,
  type ChatRefusal,
  type ChatTarget,
  type FlagCategory,
  parseCaution,
  START_WINDOW_HOURS,
  type StoredCard,
  storedCardSchema,
} from "../schemas/chat";
import { publishNotify } from "../user-socket";
import { fetchCollectionsBySlug } from "./list";
import { fetchOffers, offerItemCards, toOfferView } from "./offer-view";
import { toPublicUser } from "./profile";
import { redis } from "./redis";
import { activeSanctionWhere, notBlockedBy, notBlockedEither, notTradeSanctioned } from "./safety";

export function refuse(reason: ChatRefusal, retryAt?: Date): never {
  const data = retryAt ? { reason, retryAt: retryAt.toISOString() } : { reason };
  switch (reason) {
    case "start_limit":
    case "message_limit":
      throw new ORPCError("TOO_MANY_REQUESTS", { data });
    case "self":
    case "invalid_card":
      throw new ORPCError("BAD_REQUEST", { data });
    case "no_address":
    case "not_accepting":
    case "hidden_owner":
    case "muted":
      throw new ORPCError("FORBIDDEN", { data });
  }
}

const unique = <T>(values: T[]) => [...new Set(values)];

export async function fetchPref(userId: string): Promise<MessagePref> {
  const [row] = await db
    .select({ allow: messagePref.allow, allowHidden: messagePref.allowHidden })
    .from(messagePref)
    .where(eq(messagePref.userId, userId));
  return toMessagePref(row);
}

/** The account behind a Message target, and whether that surface hides it. */
export async function resolveTarget(
  target: ChatTarget,
): Promise<{ recipientId: string; hidesOwner: boolean }> {
  switch (target.kind) {
    case "list": {
      const [row] = await db
        .select({ userId: lists.userId, hideUser: lists.hideUser })
        .from(lists)
        .where(eq(lists.slug, target.slug));
      if (!row) throw new ORPCError("NOT_FOUND");
      return { recipientId: row.userId, hidesOwner: row.hideUser };
    }
    case "profile": {
      const [row] = await db
        .select({ userId: userAddress.userId, hideUser: userAddress.hideUser })
        .from(userAddress)
        .where(eq(userAddress.address, target.address.toLowerCase()));
      if (!row?.userId) throw new ORPCError("NOT_FOUND");
      return { recipientId: row.userId, hidesOwner: row.hideUser };
    }
    case "user": {
      const exists = await db.$count(user, eq(user.id, target.userId));
      if (exists === 0) throw new ORPCError("NOT_FOUND");
      return { recipientId: target.userId, hidesOwner: false };
    }
  }
}

export async function hasLinkedAddress(userId: string) {
  return (await db.$count(userAddress, eq(userAddress.userId, userId))) > 0;
}

const MESSAGE_WINDOW_SCRIPT = `
redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", ARGV[1] - ARGV[2])
local prior = redis.call("ZRANGE", KEYS[1], 0, -1)
redis.call("ZADD", KEYS[1], ARGV[1], ARGV[3])
redis.call("PEXPIRE", KEYS[1], ARGV[2])
return prior
`;

const sendTime = (member: string) => Number(member.split(":")[0]);

/**
 * Reads the earlier sends and adds this one in one script, so parallel sends each see the
 * others; a refused send is taken back out and never counts. Returns the release for a send
 * refused later on.
 */
export async function checkMessageRate(userId: string, now: Date): Promise<() => Promise<void>> {
  const key = `chat:msgs:${userId}`;
  const member = `${now.getTime()}:${crypto.randomUUID()}`;
  const prior = (await redis.send("EVAL", [
    MESSAGE_WINDOW_SCRIPT,
    "1",
    key,
    String(now.getTime()),
    String(MESSAGE_WINDOW_MS),
    member,
  ])) as string[];

  const release = async () => {
    await redis.send("ZREM", [key, member]);
  };
  const decision = messageRateDecision(prior.map(sendTime), now);
  if (!decision.ok) {
    await release();
    refuse("message_limit", decision.retryAt);
  }
  return release;
}

/** Taken inside the start transaction, so a user's parallel starts are counted one at a time. */
export async function lockStarts(tx: Tx, userId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('chat_start'), hashtext(${userId}))`);
}

/** The times of the user's new conversations in the start window. */
export async function recentStarts(tx: Tx, userId: string, now: Date): Promise<number[]> {
  const since = new Date(now.getTime() - START_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const rows = await tx
    .select({ createdAt: conversation.createdAt })
    .from(conversation)
    .where(
      and(
        or(eq(conversation.userLow, userId), eq(conversation.userHigh, userId)),
        eq(conversation.createdBy, userId),
        gt(conversation.createdAt, since),
      ),
    );
  return rows.map((row) => new Date(row.createdAt).getTime());
}

export type StartContext = {
  senderId: string;
  senderCreatedAt: Date;
  recipientId: string;
  hidesOwner: boolean;
  senderHasAddress: boolean;
  pref: MessagePref;
  safety: Awaited<ReturnType<typeof chatSafety>>;
  now: Date;
};

/** What a start reads before its transaction. */
export async function prepareStart(
  senderId: string,
  senderCreatedAt: Date,
  target: ChatTarget,
  now: Date,
): Promise<StartContext> {
  const { recipientId, hidesOwner } = await resolveTarget(target);
  const [senderHasAddress, pref, safety] = await Promise.all([
    hasLinkedAddress(senderId),
    fetchPref(recipientId),
    chatSafety(senderId, recipientId),
  ]);
  return {
    senderId,
    senderCreatedAt,
    recipientId,
    hidesOwner,
    senderHasAddress,
    pref,
    safety,
    now,
  };
}

/**
 * Under the sender's start lock: refuses a start `startVerdict` refuses, and returns the
 * pair's existing conversation, if any.
 */
export async function checkStart(tx: Tx, ctx: StartContext): Promise<number | undefined> {
  const { senderId, recipientId, now } = ctx;
  await lockStarts(tx, senderId);
  const { userLow, userHigh } = pairKey(senderId, recipientId);
  const [existing] = await tx
    .select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
  const rate =
    existing || senderId === recipientId
      ? ({ ok: true } as const)
      : rateDecision(await recentStarts(tx, senderId, now), ctx.senderCreatedAt, now);

  const verdict = startVerdict({
    senderId,
    recipientId,
    senderHasAddress: ctx.senderHasAddress,
    pref: ctx.pref,
    hidesOwner: ctx.hidesOwner,
    blocked: ctx.safety.blocked,
    senderMuted: ctx.safety.mute !== null,
    existing: existing !== undefined,
    rate,
  });
  if (!verdict.ok) refuse(verdict.reason, verdict.retryAt);
  return existing?.id;
}

/** Creates the conversation when `existingId` is undefined; `opensWithContent` keeps it out of the recipient's Requests. */
export async function ensureConversation(
  tx: Tx,
  ctx: StartContext,
  existingId: number | undefined,
  opensWithContent: boolean,
): Promise<{ id: number; created: boolean }> {
  if (existingId !== undefined) return { id: existingId, created: false };
  const { senderId, recipientId } = ctx;
  const { userLow, userHigh } = pairKey(senderId, recipientId);
  const [row] = await tx
    .insert(conversation)
    .values({ userLow, userHigh, createdBy: senderId })
    .onConflictDoNothing()
    .returning({ id: conversation.id });
  if (row) {
    const members = startMembers(opensWithContent);
    await tx.insert(conversationMember).values([
      { conversationId: row.id, userId: senderId, ...members.sender },
      { conversationId: row.id, userId: recipientId, ...members.recipient },
    ]);
    return { id: row.id, created: true };
  }
  // the other side started it at the same moment
  const [raced] = await tx
    .select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
  if (!raced) throw new ORPCError("CONFLICT");
  return { id: raced.id, created: false };
}

export type CardContext = { senderId: string; partnerId: string; targetListSlug: string | null };

/** An objekt only of the card's collection, and a list by `cardListAllowed`. */
export async function resolveCard(input: CardInput, context: CardContext): Promise<StoredCard> {
  const [list, collection, objekt] = await Promise.all([
    input.listSlug === undefined
      ? undefined
      : db
          .select({
            id: lists.id,
            ownerId: lists.userId,
            hideUser: lists.hideUser,
            slug: lists.slug,
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
  if (list && !cardListAllowed(list, context.senderId, context.partnerId, context.targetListSlug)) {
    refuse("invalid_card");
  }
  if (objekt && objekt.collectionId !== collection.id) refuse("invalid_card");

  return {
    collectionSlug: input.collectionSlug,
    ...(input.objektId === undefined ? {} : { objektId: input.objektId }),
    ...(list ? { listId: list.id } : {}),
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const memberColumns = {
  userId: conversationMember.userId,
  request: conversationMember.request,
  archivedAt: conversationMember.archivedAt,
  mutedUntil: conversationMember.mutedUntil,
  lastReadMessageId: conversationMember.lastReadMessageId,
};

async function writeMember(tx: Tx, conversationId: number, userId: string, state: MemberState) {
  await tx
    .update(conversationMember)
    .set(state)
    .where(
      and(
        eq(conversationMember.conversationId, conversationId),
        eq(conversationMember.userId, userId),
      ),
    );
}

/**
 * Inserts a message under the conversation's row lock, so ids grow in commit order within
 * a conversation and a client reading `after` its newest id never skips one.
 */
export async function appendMessage(
  tx: Tx,
  conversationId: number,
  senderId: string,
  body: string | null,
  card: StoredCard | null,
  caution: FlagCategory[] = [],
  offerId: number | null = null,
) {
  await tx
    .select({ id: conversation.id })
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .for("update");

  const [inserted] = await tx
    .insert(message)
    .values({
      conversationId,
      senderId,
      body,
      card,
      offerId,
      caution: caution.length ? caution : null,
    })
    .returning({ id: message.id, createdAt: message.createdAt });
  if (!inserted) throw new Error("message insert returned no row");

  if (caution.length > 0) {
    await tx
      .insert(messageFlag)
      .values(caution.map((category) => ({ userId: senderId, messageId: inserted.id, category })));
  }

  await tx
    .update(conversation)
    .set({ lastMessageId: inserted.id, lastMessageAt: inserted.createdAt })
    .where(eq(conversation.id, conversationId));

  const members = await tx
    .select(memberColumns)
    .from(conversationMember)
    .where(eq(conversationMember.conversationId, conversationId))
    .for("update");

  const now = new Date().toISOString();
  for (const { userId, ...state } of members) {
    const event: MemberEvent =
      userId === senderId ? { type: "send", messageId: inserted.id } : { type: "incoming" };
    await writeMember(tx, conversationId, userId, nextMemberState(state, event, now));
  }
  return inserted;
}

/** The conversation's two ids when `userId` is one of them; NOT_FOUND otherwise. */
export async function findMembership(conversationId: number, userId: string) {
  const [row] = await db
    .select({
      userLow: conversation.userLow,
      userHigh: conversation.userHigh,
      lastMessageId: conversation.lastMessageId,
    })
    .from(conversation)
    .where(
      and(
        eq(conversation.id, conversationId),
        or(eq(conversation.userLow, userId), eq(conversation.userHigh, userId)),
      ),
    );
  if (!row) throw new ORPCError("NOT_FOUND");
  return { ...row, partnerId: row.userLow === userId ? row.userHigh : row.userLow };
}

/** Applies one member event under a row lock and returns the new state. */
export async function updateMember(
  conversationId: number,
  userId: string,
  toEvent: (state: MemberState, lastMessageId: number | null) => MemberEvent | null,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ ...memberColumns, lastMessageId: conversation.lastMessageId })
      .from(conversationMember)
      .innerJoin(conversation, eq(conversation.id, conversationMember.conversationId))
      .where(
        and(
          eq(conversationMember.conversationId, conversationId),
          eq(conversationMember.userId, userId),
        ),
      )
      .for("update", { of: conversationMember });
    if (!row) throw new ORPCError("NOT_FOUND");

    const { userId: _, lastMessageId, ...state } = row;
    const event = toEvent(state, lastMessageId);
    if (event === null) return { state, changed: false };
    const next = nextMemberState(state, event, new Date().toISOString());
    await writeMember(tx, conversationId, userId, next);
    return { state: next, changed: true };
  });
}

/** Blocks between the pair, and the user's own chat mute in force. */
export async function chatSafety(userId: string, partnerId: string) {
  const [blocks, mutes] = await Promise.all([
    db.execute<{
      blocked: boolean;
      blocked_by_me: boolean;
      trade_blocked: boolean;
      partner_trade_blocked: boolean;
    }>(sql`
      SELECT NOT ${notBlockedEither(userId, partnerId)} AS blocked,
        NOT ${notBlockedBy(userId, partnerId)} AS blocked_by_me,
        NOT ${notTradeSanctioned(userId)} AS trade_blocked,
        NOT ${notTradeSanctioned(partnerId)} AS partner_trade_blocked
    `),
    db
      .select({ reason: userSanction.reason, expiresAt: userSanction.expiresAt })
      .from(userSanction)
      .where(
        and(
          eq(userSanction.userId, userId),
          eq(userSanction.type, "chat_mute"),
          activeSanctionWhere,
        ),
      ),
  ]);
  const [row] = blocks.rows;
  return {
    blocked: row?.blocked ?? false,
    blockedByMe: row?.blocked_by_me ?? false,
    mute: effectiveSanction(mutes),
    tradeBlocked: row?.trade_blocked ?? false,
    partnerTradeBlocked: row?.partner_trade_blocked ?? false,
  };
}

/** The blocker's list and badge drop the conversation, and both sides' For you change. */
export async function afterBlockChange(blockerId: string, otherId: string) {
  const { userLow, userHigh } = pairKey(blockerId, otherId);
  const [row] = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
  await bumpTradeVersion(redis, [blockerId, otherId]);
  if (row) await publishChatChanged([blockerId], row.id);
}

export async function publishChatChanged(userIds: string[], conversationId: number) {
  await Promise.all(
    unique(userIds).map((userId) =>
      publishNotify(userId, { type: "chat_changed", conversationId }),
    ),
  );
}

/** Each account as a conversation heads it, with its avatar. */
export async function fetchPartners(userIds: string[]) {
  const ids = unique(userIds);
  if (ids.length === 0) return new Map<string, never>();
  const [users, addresses] = await Promise.all([
    db.select().from(user).where(inArray(user.id, ids)),
    db
      .select({
        userId: userAddress.userId,
        address: userAddress.address,
        nickname: userAddress.nickname,
        hideNickname: userAddress.hideNickname,
        hideUser: userAddress.hideUser,
      })
      .from(userAddress)
      .where(inArray(userAddress.userId, ids))
      .orderBy(asc(userAddress.id)),
  ]);

  const addressesOf = new Map<string, ChatAddress[]>();
  for (const { userId, ...info } of addresses) {
    if (!userId) continue;
    addressesOf.set(userId, [...(addressesOf.get(userId) ?? []), info]);
  }
  return new Map(
    users.map((account) => [
      account.id,
      {
        userId: account.id,
        user: toPublicUser(account),
        identity: chatIdentity(account.name, addressesOf.get(account.id) ?? []),
      },
    ]),
  );
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
            hideNickname: userAddress.hideNickname,
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
                  nickname: list.hideNickname ? null : (list.nickname ?? null),
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

export type MessageRow = {
  id: number;
  senderId: string;
  body: string | null;
  card: unknown;
  createdAt: string;
  caution: string[] | null;
  offerId?: number | null;
};

/** `limits` are the viewer's own, so an offer card offers only what the viewer may do. */
export async function toChatMessages(
  rows: MessageRow[],
  viewerId: string,
  limits: ActorLimits = {},
) {
  const cards = rows.map((row) => parseCard(row.card));
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
    return {
      id: row.id,
      mine: row.senderId === viewerId,
      body: row.body,
      card: card ? view(card) : null,
      createdAt: new Date(row.createdAt).toISOString(),
      // an offer's caution is its note's, shown on the offer card
      caution: row.senderId === viewerId || offer ? null : parseCaution(row.caution),
      offer: offer ? toOfferView(offer, viewerId, now, limits, serial) : null,
    };
  });
  return { messages, collections: collectionMap };
}
