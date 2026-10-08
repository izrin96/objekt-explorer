import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversation, conversationMember, lists, user, userAddress } from "@repo/db/schema";
import { and, eq, gt, or, sql } from "drizzle-orm";

import {
  type MessagePref,
  pairKey,
  rateDecision,
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

async function hasLinkedAddress(userId: string) {
  return (await db.$count(userAddress, eq(userAddress.userId, userId))) > 0;
}

/** Taken inside the start transaction, so a user's parallel starts are counted one at a time. */
async function lockStarts(tx: Tx, userId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('chat_start'), hashtext(${userId}))`);
}

/** The times of the user's new conversations in the start window. */
async function recentStarts(tx: Tx, userId: string, now: Date): Promise<number[]> {
  const since = new Date(now.getTime() - START_WINDOW_HOURS * HOUR_MS).toISOString();
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
    blocked: ctx.safety.blocked,
    senderMuted: ctx.safety.mute !== null,
    existing: existing !== undefined,
    rate,
  });
  if (!verdict.ok) refuse(verdict.reason, verdict.retryAt);
  return existing?.id;
}

/** Creates the conversation when `existingId` is undefined; its first message decides Requests. */
export async function ensureConversation(
  tx: Tx,
  ctx: StartContext,
  existingId: number | undefined,
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
    const members = startMembers();
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
