import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { message } from "@repo/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type * as z from "zod";

import { holdsMessage, muteEnd, sendVerdict } from "../../lib/chat-rules";
import { scanMessage } from "../../lib/scam-patterns";
import { publishNotify } from "../../realtime";
import {
  type sendInputSchema,
  type startInputSchema,
  TYPING_GUARD_MS,
  UNSEND_WINDOW_MINUTES,
} from "../../schemas/chat";
import { redis, redisFailOpen } from "../redis";
import { hydrateCards, hydratePostCards, resolveCard, toChatMessages } from "./cards";
import { loadThread } from "./inbox";
import { publishChatMessage } from "./live";
import { appendMessage, findMembership, findSentMessage } from "./members";
import { checkMessageRate } from "./rate";
import { refuse } from "./refuse";
import { chatSafety } from "./safety";
import { activityBetween } from "./settings";
import {
  checkStart,
  ensureConversation,
  hasLinkedAddress,
  lockStarts,
  openFirst,
  prepareFirst,
  prepareStart,
} from "./start";

/** A blocked send reads exactly like a recipient who accepts no messages. */
function refuseSend(safety: { blocked: boolean; mute: { until: string | null } | null }) {
  const verdict = sendVerdict({ blocked: safety.blocked, senderMuted: safety.mute !== null });
  if (!verdict.ok) refuse(verdict.reason, muteEnd(safety.mute));
}

/**
 * Opens the conversation with the target's account, creating it when there is none. A card is
 * checked as sending would check it and handed back to attach, never sent from here. The
 * thread's newest page comes back too, so the client opens it without a second request.
 */
export async function startConversation(
  me: string,
  createdAt: Date,
  input: z.infer<typeof startInputSchema>,
) {
  const ctx = await prepareStart(me, createdAt, input.to, new Date()).catch((error: unknown) => {
    // a Message button on a list that was deleted since the page loaded
    if (input.to.kind === "list" && error instanceof ORPCError && error.code === "NOT_FOUND") {
      refuse("invalid_card");
    }
    throw error;
  });

  const result = await db.transaction(async (tx) => {
    const existingId = await checkStart(tx, ctx);
    if (input.card) refuseSend(ctx.safety);
    const card = input.card
      ? await resolveCard(input.card, { senderId: me, partnerId: ctx.recipientId })
      : null;
    return { ...(await ensureConversation(tx, ctx, existingId)), card };
  });

  // the conversation is open whatever this read does; the client loads the thread itself on null
  const thread = loadThread(me, { id: result.id }).catch((error: unknown) => {
    console.warn(`[chat] start ${result.id}: thread read failed`, error);
    return null;
  });
  const { card } = result;
  if (!card) return { id: result.id, card: null, thread: await thread };
  if (card.kind === "post") {
    const [{ view, collections }, page] = await Promise.all([
      hydratePostCards([card.stored], me),
      thread,
    ]);
    return {
      id: result.id,
      card: { kind: "post" as const, input: card.input, view: view(card.stored), collections },
      thread: page,
    };
  }
  const [{ view, collections }, page] = await Promise.all([
    hydrateCards([card.stored], me),
    thread,
  ]);
  return {
    id: result.id,
    card: { kind: "objekt" as const, input: card.input, view: view(card.stored), collections },
    thread: page,
  };
}

const sendResult = (own: Awaited<ReturnType<typeof toChatMessages>>) => ({
  message: own.messages[0]!,
  collections: own.collections,
});

export async function sendMessage(
  me: string,
  createdAt: Date,
  input: z.infer<typeof sendInputSchema>,
) {
  const now = new Date();
  const { partnerId, lastMessageId } = await findMembership(input.conversationId, me);
  // a retry of a send that landed returns it, whatever has changed since: nothing is counted or published
  const stored = input.clientId
    ? await findSentMessage(me, input.clientId, input.conversationId)
    : undefined;
  if (stored) return sendResult(await toChatMessages([{ ...stored, senderId: me }], me));

  const [safety, hasAddress] = await Promise.all([chatSafety(me, partnerId), hasLinkedAddress(me)]);
  if (!hasAddress) refuse("no_address");
  refuseSend(safety);
  const release = await checkMessageRate(me, now);
  const body = input.body ?? null;
  const caution = body === null ? [] : scanMessage(body);

  const sent = await (async () => {
    const card = input.card
      ? (await resolveCard(input.card, { senderId: me, partnerId })).stored
      : null;
    // the first message is the conversation's start; the start lock comes before the row lock
    const first = holdsMessage(lastMessageId)
      ? null
      : await prepareFirst(me, createdAt, partnerId, now);
    return db.transaction(async (tx) => {
      if (first) await lockStarts(tx, me);
      return appendMessage(tx, input.conversationId, me, {
        body,
        card,
        caution,
        clientId: input.clientId,
        first: first ? () => openFirst(tx, first, input.conversationId) : undefined,
      });
    });
  })().catch(async (error: unknown) => {
    // a send refused after it was counted must not count
    await release();
    throw error;
  });
  const row = { ...sent, senderId: me };
  const own = await toChatMessages([row], me);
  if (sent.duplicate) {
    await release();
  } else {
    // not awaited, so a slow real-time server never slows the send; it logs its own failures
    void publishChatMessage(input.conversationId, sent.previousMessageId, row, [me, partnerId], {
      [me]: own,
    });
  }
  return sendResult(own);
}

/** Tells the partner the caller is typing, when both show activity and the caller may send. */
export async function notifyTyping(me: string, conversationId: number) {
  const { partnerId, lastMessageId } = await findMembership(conversationId, me);
  // the conversation reaches the partner only with its first message
  if (!holdsMessage(lastMessageId)) return;
  // one ping per user and conversation gets through per interval, however often it is sent
  // with Redis down nothing gets through: a typing ping is not worth an unguarded publish
  const first = await redisFailOpen("chat typing", () =>
    redis.send("SET", [
      `chat:typing:${me}:${conversationId}`,
      "1",
      "NX",
      "PX",
      String(TYPING_GUARD_MS),
    ]),
  );
  if (first === null) return;
  const safety = await chatSafety(me, partnerId);
  if (safety.blocked || safety.mute !== null) return;
  const activity = await activityBetween(conversationId, me, partnerId, safety.blockedEitherWay);
  if (!activity.toPartner) return;
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
