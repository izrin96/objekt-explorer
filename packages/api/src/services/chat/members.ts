import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversation, conversationMember, message, messageFlag } from "@repo/db/schema";
import { and, eq, or } from "drizzle-orm";

import { type MemberEvent, type MemberState, nextMemberState } from "../../lib/chat-rules";
import type { FlagCategory, StoredCard } from "../../schemas/chat";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
  const [locked] = await tx
    .select({ lastMessageId: conversation.lastMessageId })
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .for("update");
  const opensWithContent = locked?.lastMessageId === null && (card !== null || offerId !== null);

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
      userId === senderId
        ? { type: "send", messageId: inserted.id }
        : { type: "incoming", opensWithContent };
    await writeMember(tx, conversationId, userId, nextMemberState(state, event, now));
  }
  // read under the row lock, so it is the message this one follows
  return { ...inserted, previousMessageId: locked?.lastMessageId ?? null };
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
