import { db } from "@repo/db";
import { message } from "@repo/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type * as z from "zod";

import { sendVerdict } from "../../lib/chat-rules";
import { scanMessage } from "../../lib/scam-patterns";
import {
  type sendInputSchema,
  type startInputSchema,
  TYPING_GUARD_MS,
  UNSEND_WINDOW_MINUTES,
} from "../../schemas/chat";
import { publishNotify } from "../../user-socket";
import { redis } from "../redis";
import { hydrateCards, resolveCard, toChatMessages } from "./cards";
import { appendMessage, findMembership } from "./members";
import { publishChatChanged } from "./notify";
import { checkMessageRate } from "./rate";
import { refuse } from "./refuse";
import { chatSafety } from "./safety";
import { activityBetween } from "./settings";
import { checkStart, ensureConversation, prepareStart } from "./start";

/** A blocked send reads exactly like a recipient who accepts no messages. */
function refuseSend(safety: { blocked: boolean; mute: { until: string | null } | null }) {
  const verdict = sendVerdict({ blocked: safety.blocked, senderMuted: safety.mute !== null });
  if (!verdict.ok) {
    refuse(verdict.reason, safety.mute?.until ? new Date(safety.mute.until) : undefined);
  }
}

/**
 * Opens the conversation with the target's account, creating it when there is none. A card is
 * checked as sending would check it and handed back to attach, never sent from here.
 */
export async function startConversation(
  me: string,
  createdAt: Date,
  input: z.infer<typeof startInputSchema>,
) {
  const ctx = await prepareStart(me, createdAt, input.to, new Date());

  const result = await db.transaction(async (tx) => {
    const existingId = await checkStart(tx, ctx);
    if (input.card) refuseSend(ctx.safety);
    const card = input.card
      ? await resolveCard(input.card, { senderId: me, partnerId: ctx.recipientId })
      : null;
    return { ...(await ensureConversation(tx, ctx, existingId)), card };
  });

  // only the opener lists an empty conversation, so only the opener hears of it
  if (result.created) await publishChatChanged([me], result.id);
  if (!input.card || !result.card) return { id: result.id, created: result.created, card: null };
  const { view, collections } = await hydrateCards([result.card]);
  return {
    id: result.id,
    created: result.created,
    card: { input: input.card, view: view(result.card), collections },
  };
}

export async function sendMessage(me: string, input: z.infer<typeof sendInputSchema>) {
  const now = new Date();
  const { partnerId } = await findMembership(input.conversationId, me);
  refuseSend(await chatSafety(me, partnerId));
  const release = await checkMessageRate(me, now);
  const body = input.body ?? null;
  const caution = body === null ? [] : scanMessage(body);

  const sent = await (async () => {
    const card = input.card ? await resolveCard(input.card, { senderId: me, partnerId }) : null;
    const row = await db.transaction((tx) =>
      appendMessage(tx, input.conversationId, me, body, card, caution),
    );
    return { ...row, card };
  })().catch(async (error: unknown) => {
    // a send refused after it was counted must not count
    await release();
    throw error;
  });
  await publishChatChanged([me, partnerId], input.conversationId);

  const { messages, collections } = await toChatMessages(
    [{ ...sent, senderId: me, body, caution }],
    me,
  );
  return { message: messages[0]!, collections };
}

/** Tells the partner the caller is typing, when both show activity and the caller may send. */
export async function notifyTyping(me: string, conversationId: number) {
  const { partnerId, lastMessageId } = await findMembership(conversationId, me);
  // the conversation reaches the partner only with its first message
  if (lastMessageId === null) return;
  // one ping per user and conversation gets through per interval, however often it is sent
  const first = await redis.send("SET", [
    `chat:typing:${me}:${conversationId}`,
    "1",
    "NX",
    "PX",
    String(TYPING_GUARD_MS),
  ]);
  if (first === null) return;
  const [safety, activity] = await Promise.all([
    chatSafety(me, partnerId),
    activityBetween(conversationId, me, partnerId),
  ]);
  if (!activity.toPartner || safety.blocked || safety.mute !== null) return;
  await publishNotify(partnerId, { type: "chat_typing", conversationId });
}

/** The sender takes back a text or card message within the window; its row stays for reports. */
export async function unsendMessage(me: string, messageId: number) {
  const [row] = await db
    .update(message)
    .set({ unsentAt: sql`now()` })
    .where(
      and(
        eq(message.id, messageId),
        eq(message.senderId, me),
        isNull(message.offerId),
        isNull(message.unsentAt),
        gt(message.createdAt, sql`now() - make_interval(mins => ${UNSEND_WINDOW_MINUTES})`),
      ),
    )
    .returning({ conversationId: message.conversationId });
  if (!row) refuse("unsend_closed");
  const { partnerId } = await findMembership(row.conversationId, me);
  await Promise.all(
    [me, partnerId].map((userId) =>
      publishNotify(userId, {
        type: "chat_unsent",
        conversationId: row.conversationId,
        messageId,
      }),
    ),
  );
}
