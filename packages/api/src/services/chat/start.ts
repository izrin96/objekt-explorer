import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversation, conversationMember, lists, user, userAddress } from "@repo/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

import {
  type MessagePref,
  holdsMessage,
  pairKey,
  rateDecision,
  startFactsOf,
  startMembers,
  startVerdict,
} from "../../lib/chat-rules";
import { HOUR_MS } from "../../lib/time";
import { type ChatTarget, START_WINDOW_HOURS } from "../../schemas/chat";
import type { Tx } from "./members";
import { refuse } from "./refuse";
import { chatSafety } from "./safety";
import { fetchPref } from "./settings";

/** The account behind a Message target. */
async function resolveTarget(target: ChatTarget): Promise<{ recipientId: string }> {
  switch (target.kind) {
    case "list": {
      const [row] = await db
        .select({ userId: lists.userId })
        .from(lists)
        .where(eq(lists.slug, target.slug));
      if (!row) throw new ORPCError("NOT_FOUND");
      return { recipientId: row.userId };
    }
    case "profile": {
      const [row] = await db
        .select({ userId: userAddress.userId })
        .from(userAddress)
        .where(eq(userAddress.address, target.address.toLowerCase()));
      if (!row?.userId) throw new ORPCError("NOT_FOUND");
      return { recipientId: row.userId };
    }
    case "user": {
      const exists = await db.$count(user, eq(user.id, target.userId));
      if (exists === 0) throw new ORPCError("NOT_FOUND");
      return { recipientId: target.userId };
    }
  }
}

export async function hasLinkedAddress(userId: string) {
  return (await db.$count(userAddress, eq(userAddress.userId, userId))) > 0;
}

/**
 * Taken inside the start transaction, so a user's parallel starts are counted one at a time.
 * Every path takes it before the conversation row lock, never after.
 */
export async function lockStarts(tx: Tx, userId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('chat_start'), hashtext(${userId}))`);
}

/** The times the user's conversations were started, by their first message or offer, in the start window. */
async function recentStarts(tx: Tx, userId: string, now: Date): Promise<number[]> {
  const since = new Date(now.getTime() - START_WINDOW_HOURS * HOUR_MS).toISOString();
  const rows = await tx
    .select({ startedAt: conversation.startedAt })
    .from(conversation)
    .where(and(eq(conversation.startedBy, userId), gt(conversation.startedAt, since)));
  return rows.flatMap((row) => (row.startedAt === null ? [] : [new Date(row.startedAt).getTime()]));
}

export type StartContext = {
  senderId: string;
  senderCreatedAt: Date;
  recipientId: string;
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
  const { recipientId } = await resolveTarget(target);
  return prepareFirst(senderId, senderCreatedAt, recipientId, now);
}

/** The same reads for a conversation that already exists, ahead of its first message. */
export async function prepareFirst(
  senderId: string,
  senderCreatedAt: Date,
  recipientId: string,
  now = new Date(),
): Promise<StartContext> {
  const [senderHasAddress, pref, safety] = await Promise.all([
    hasLinkedAddress(senderId),
    fetchPref(recipientId),
    chatSafety(senderId, recipientId),
  ]);
  return {
    senderId,
    senderCreatedAt,
    recipientId,
    senderHasAddress,
    pref,
    safety,
    now,
  };
}

/** Refuses what `startVerdict` refuses; `existing` is a conversation that holds a message. Counts no start. */
async function refuseStart(tx: Tx, ctx: StartContext, existing: boolean) {
  const { senderId, recipientId, now } = ctx;
  const rate =
    existing || senderId === recipientId
      ? ({ ok: true } as const)
      : rateDecision(await recentStarts(tx, senderId, now), ctx.senderCreatedAt, now);
  const verdict = startVerdict(startFactsOf(ctx, existing, rate));
  if (!verdict.ok) refuse(verdict.reason, verdict.retryAt);
}

/**
 * Under the sender's start lock: refuses a start `startVerdict` refuses, and returns the
 * pair's existing conversation, if any. An existing one that holds no message yet is checked
 * like a new one.
 */
export async function checkStart(tx: Tx, ctx: StartContext): Promise<number | undefined> {
  const { senderId, recipientId } = ctx;
  await lockStarts(tx, senderId);
  const { userLow, userHigh } = pairKey(senderId, recipientId);
  const [existing] = await tx
    .select({ id: conversation.id, lastMessageId: conversation.lastMessageId })
    .from(conversation)
    .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
  await refuseStart(tx, ctx, holdsMessage(existing?.lastMessageId));
  return existing?.id;
}

/**
 * Runs under the conversation's row lock when its first message is appended, after the
 * caller took `lockStarts`: the start checks apply again, and the message becomes the start.
 */
export async function openFirst(tx: Tx, ctx: StartContext, conversationId: number) {
  await refuseStart(tx, { ...ctx, now: new Date() }, false);
  await tx
    .update(conversation)
    .set({ startedBy: ctx.senderId, startedAt: sql`now()` })
    .where(eq(conversation.id, conversationId));
}

/** Creates the conversation when `existingId` is undefined, and marks it opened by the sender. */
export async function ensureConversation(
  tx: Tx,
  ctx: StartContext,
  existingId: number | undefined,
): Promise<{ id: number; created: boolean }> {
  const { senderId, recipientId } = ctx;
  const openedAt = ctx.now.toISOString();
  const markOpened = (conversationId: number) =>
    tx
      .update(conversationMember)
      .set({ openedAt })
      .where(
        and(
          eq(conversationMember.conversationId, conversationId),
          eq(conversationMember.userId, senderId),
          isNull(conversationMember.openedAt),
        ),
      );
  if (existingId !== undefined) {
    await markOpened(existingId);
    return { id: existingId, created: false };
  }
  const { userLow, userHigh } = pairKey(senderId, recipientId);
  const [row] = await tx
    .insert(conversation)
    .values({ userLow, userHigh, createdBy: senderId })
    .onConflictDoNothing()
    .returning({ id: conversation.id });
  if (row) {
    const members = startMembers();
    await tx.insert(conversationMember).values([
      { conversationId: row.id, userId: senderId, openedAt, ...members.sender },
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
  await markOpened(raced.id);
  return { id: raced.id, created: false };
}
