import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversation, conversationMember, message, messageFlag } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { type MemberEvent, type MemberState, nextMemberState } from "../../lib/chat-rules";
import { type FlagCategory, parseCaution, type StoredCard } from "../../schemas/chat";
import { parseCard } from "./cards";

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

type AppendInput = {
  body?: string | null;
  card?: StoredCard | null;
  caution?: FlagCategory[];
  offerId?: number | null;
  /** makes a retry of the same send return the stored message instead of posting twice */
  clientId?: string;
  /** runs under the row lock when the conversation holds no message yet; a throw aborts the send */
  first?: () => Promise<void>;
};

/**
 * The sender's message stored under `clientId`, read back as a send result. A `clientId` that
 * belongs to another conversation is refused: it names a message that is not this send's.
 */
export async function findSentMessage(
  senderId: string,
  clientId: string,
  conversationId: number,
  executor: Pick<typeof db, "select"> = db,
) {
  const [row] = await executor
    .select({
      id: message.id,
      conversationId: message.conversationId,
      createdAt: message.createdAt,
      body: message.body,
      card: message.card,
      caution: message.caution,
      unsentAt: message.unsentAt,
    })
    .from(message)
    .where(and(eq(message.senderId, senderId), eq(message.clientId, clientId)));
  if (!row) return undefined;
  if (row.conversationId !== conversationId) throw new ORPCError("BAD_REQUEST");
  return { ...row, card: parseCard(row.card), caution: parseCaution(row.caution) };
}

/**
 * Inserts a message under the conversation's row lock, so ids grow in commit order within
 * a conversation and a client reading `after` its newest id never skips one. A `clientId`
 * already stored for the sender returns that message with `duplicate` set and changes nothing.
 */
export async function appendMessage(
  tx: Tx,
  conversationId: number,
  senderId: string,
  {
    body = null,
    card = null,
    caution = [],
    offerId = null,
    clientId,
    first: openFirst,
  }: AppendInput,
) {
  const [locked] = await tx
    .select({ lastMessageId: conversation.lastMessageId })
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .for("update");
  const first = locked?.lastMessageId === null;
  const opensWithContent = first && (card !== null || offerId !== null);
  if (first) await openFirst?.();

  const [inserted] = await tx
    .insert(message)
    .values({
      conversationId,
      senderId,
      body,
      card,
      offerId,
      caution: caution.length ? caution : null,
      clientId: clientId ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: message.id, createdAt: message.createdAt });
  if (!inserted) {
    const stored = clientId
      ? await findSentMessage(senderId, clientId, conversationId, tx)
      : undefined;
    if (!stored) throw new Error("message insert returned no row");
    return { ...stored, previousMessageId: null, duplicate: true as const };
  }

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
        : { type: "incoming", first, opensWithContent };
    await writeMember(tx, conversationId, userId, nextMemberState(state, event, now));
  }
  // read under the row lock, so it is the message this one follows
  return {
    ...inserted,
    body,
    card,
    caution: caution.length ? caution : null,
    previousMessageId: locked?.lastMessageId ?? null,
    duplicate: false as const,
  };
}

/**
 * A conversation with no message yet belongs to the member who opened it, and to no one else.
 * `as` names the table aliases when it is read from raw SQL rather than through Drizzle.
 */
export function visibleToMember(userId: string, as?: { conversation: string; member: string }) {
  const lastMessageId = as
    ? sql.raw(`${as.conversation}.last_message_id`)
    : conversation.lastMessageId;
  const createdBy = as ? sql.raw(`${as.conversation}.created_by`) : conversation.createdBy;
  const openedAt = as ? sql.raw(`${as.member}.opened_at`) : conversationMember.openedAt;
  return sql`(${lastMessageId} IS NOT NULL OR ${createdBy} = ${userId} OR ${openedAt} IS NOT NULL)`;
}

/** The conversation's two ids when `userId` is a member who can see it; NOT_FOUND otherwise. */
export async function findMembership(conversationId: number, userId: string) {
  const [row] = await db
    .select({
      userLow: conversation.userLow,
      userHigh: conversation.userHigh,
      lastMessageId: conversation.lastMessageId,
    })
    .from(conversation)
    .innerJoin(
      conversationMember,
      and(
        eq(conversationMember.conversationId, conversation.id),
        eq(conversationMember.userId, userId),
      ),
    )
    .where(and(eq(conversation.id, conversationId), visibleToMember(userId)));
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
          visibleToMember(userId),
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
