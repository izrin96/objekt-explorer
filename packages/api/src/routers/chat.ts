import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversationMember, message, messagePref, userAddress } from "@repo/db/schema";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";

import { isMuted, rowUnread, sendVerdict } from "../lib/chat-rules";
import { scanMessage } from "../lib/scam-patterns";
import { authed } from "../orpc";
import {
  CONVERSATION_PAGE_SIZE,
  type ChatBox,
  conversationIdInputSchema,
  type ConversationRow,
  listConversationsInputSchema,
  markReadInputSchema,
  MESSAGE_PREF_DEFAULTS,
  type MessageSettings,
  MUTE_HOURS,
  muteInputSchema,
  sendInputSchema,
  setSettingsInputSchema,
  startInputSchema,
  THREAD_PAGE_SIZE,
  threadInputSchema,
} from "../schemas/chat";
import {
  appendMessage,
  chatSafety,
  checkMessageRate,
  checkStart,
  ensureConversation,
  fetchPartners,
  fetchSettings,
  findMembership,
  parseCard,
  prepareStart,
  publishChatChanged,
  refuse,
  resolveCard,
  toChatMessages,
  updateMember,
} from "../services/chat";
import { reputationOf } from "../services/reputation";
import { notBlockedBy } from "../services/safety";

/** A blocked send reads exactly like a recipient who accepts no messages. */
function refuseSend(safety: { blocked: boolean; mute: { until: string | null } | null }) {
  const verdict = sendVerdict({ blocked: safety.blocked, senderMuted: safety.mute !== null });
  if (!verdict.ok) {
    refuse(verdict.reason, safety.mute?.until ? new Date(safety.mute.until) : undefined);
  }
}

const BOX_WHERE: Record<ChatBox, ReturnType<typeof sql>> = {
  inbox: sql`m.archived_at IS NULL AND NOT m.request`,
  requests: sql`m.archived_at IS NULL AND m.request`,
  archived: sql`m.archived_at IS NOT NULL`,
};

const partnerOf = (me: string) =>
  sql`CASE WHEN c.user_low = ${me} THEN c.user_high ELSE c.user_low END`;

/** Mirrors `visibleBox`, over member `m` of conversation `c`. */
const visibleIn = (box: ChatBox, me: string) =>
  box === "archived"
    ? BOX_WHERE[box]
    : sql`${BOX_WHERE[box]} AND ${notBlockedBy(me, partnerOf(me))}`;

type ConversationListRow = {
  id: number;
  partner_id: string;
  active_at: string;
  request: boolean;
  archived_at: string | null;
  muted_until: string | null;
  last_read_message_id: string | null;
  message_id: string | null;
  sender_id: string | null;
  body: string | null;
  card: unknown;
  offer_id: number | null;
  created_at: string | null;
};

const toMuted = (mutedUntil: string | null, now: Date) =>
  isMuted(mutedUntil, now)
    ? { until: mutedUntil === "infinity" ? null : new Date(mutedUntil!).toISOString() }
    : null;

export const chatRouter = {
  /** Opens the conversation with the target's account, creating it when there is none. */
  start: authed.input(startInputSchema).handler(async ({ input, context: { session } }) => {
    const me = session.user.id;
    const now = new Date();
    const ctx = await prepareStart(me, new Date(session.user.createdAt), input.to, now);

    let release: (() => Promise<void>) | null = null;
    const result = await db
      .transaction(async (tx) => {
        const existingId = await checkStart(tx, ctx);
        if (input.card) refuseSend(ctx.safety);

        const card = input.card
          ? await resolveCard(input.card, {
              senderId: me,
              partnerId: ctx.recipientId,
            })
          : null;
        if (card) release = await checkMessageRate(me, now);

        const { id, created } = await ensureConversation(tx, ctx, existingId, card !== null);
        const sent = card ? await appendMessage(tx, id, me, null, card) : null;
        return { id, created, sent: sent !== null };
      })
      .catch(async (error: unknown) => {
        // a send refused after it was counted must not count
        await release?.();
        throw error;
      });

    if (result.created || result.sent) {
      await publishChatChanged([me, ctx.recipientId], result.id);
    }
    return { id: result.id, created: result.created };
  }),

  send: authed.input(sendInputSchema).handler(async ({ input, context: { session } }) => {
    const me = session.user.id;
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
  }),

  /**
   * Newest activity first. A conversation with no message yet is listed only for the one
   * who started it, so an empty request never reaches the recipient.
   */
  list: authed
    .input(listConversationsInputSchema)
    .handler(async ({ input: { box, cursor }, context: { session } }) => {
      const me = session.user.id;
      const now = new Date();
      const result = await db.execute<ConversationListRow>(sql`
        SELECT
          c.id,
          ${partnerOf(me)} AS partner_id,
          coalesce(c.last_message_at, c.created_at)::text AS active_at,
          m.request,
          m.archived_at::text AS archived_at,
          m.muted_until::text AS muted_until,
          m.last_read_message_id,
          msg.id AS message_id,
          msg.sender_id,
          msg.body,
          msg.card,
          msg.offer_id,
          msg.created_at::text AS created_at
        FROM conversation_member m
        JOIN conversation c ON c.id = m.conversation_id
        LEFT JOIN message msg ON msg.id = c.last_message_id
        WHERE m.user_id = ${me}
          AND ${visibleIn(box, me)}
          AND (c.last_message_id IS NOT NULL OR c.created_by = ${me})
          ${cursor ? sql`AND (coalesce(c.last_message_at, c.created_at), c.id) < (${cursor.at}::timestamptz, ${cursor.id})` : sql``}
        ORDER BY coalesce(c.last_message_at, c.created_at) DESC, c.id DESC
        LIMIT ${CONVERSATION_PAGE_SIZE + 1}
      `);

      const page = result.rows.slice(0, CONVERSATION_PAGE_SIZE);
      const partners = await fetchPartners(page.map((row) => row.partner_id));
      const items = page.flatMap((row): ConversationRow[] => {
        const partner = partners.get(row.partner_id);
        if (!partner) return [];
        const last =
          row.message_id === null || row.sender_id === null || row.created_at === null
            ? null
            : { id: Number(row.message_id), senderId: row.sender_id, createdAt: row.created_at };
        const lastRead =
          row.last_read_message_id === null ? null : Number(row.last_read_message_id);
        return [
          {
            id: row.id,
            partner,
            last: last && {
              id: last.id,
              mine: last.senderId === me,
              body: row.body,
              card: parseCard(row.card),
              offerId: row.offer_id,
              createdAt: new Date(last.createdAt).toISOString(),
            },
            unread: rowUnread({ request: row.request, lastReadMessageId: lastRead }, last, me),
            request: row.request,
            archived: row.archived_at !== null,
            muted: toMuted(row.muted_until, now),
          },
        ];
      });

      const lastRow = page.at(-1);
      return {
        items,
        nextCursor:
          result.rows.length > CONVERSATION_PAGE_SIZE && lastRow
            ? { at: lastRow.active_at, id: lastRow.id }
            : null,
      };
    }),

  /**
   * At most 50 messages, oldest first: the newest page, the page before `before`, or
   * the messages after `after`. `hasMore` is about the direction asked for.
   */
  thread: authed.input(threadInputSchema).handler(async ({ input, context: { session } }) => {
    const me = session.user.id;
    const { partnerId } = await findMembership(input.id, me);
    const now = new Date();

    const forward = input.after !== undefined;
    const [rows, [member], partners] = await Promise.all([
      db
        .select({
          id: message.id,
          senderId: message.senderId,
          body: message.body,
          card: message.card,
          createdAt: message.createdAt,
          caution: message.caution,
          offerId: message.offerId,
        })
        .from(message)
        .where(
          and(
            eq(message.conversationId, input.id),
            forward ? gt(message.id, input.after!) : undefined,
            input.before === undefined ? undefined : lt(message.id, input.before),
          ),
        )
        .orderBy(forward ? asc(message.id) : desc(message.id))
        .limit(THREAD_PAGE_SIZE + 1),
      db
        .select({
          request: conversationMember.request,
          archivedAt: conversationMember.archivedAt,
          mutedUntil: conversationMember.mutedUntil,
          lastReadMessageId: conversationMember.lastReadMessageId,
        })
        .from(conversationMember)
        .where(
          and(eq(conversationMember.conversationId, input.id), eq(conversationMember.userId, me)),
        ),
      fetchPartners([partnerId]),
    ]);
    const [safety, reputations] = await Promise.all([
      chatSafety(me, partnerId),
      reputationOf([partnerId]),
    ]);
    const partner = partners.get(partnerId);
    if (!member || !partner) throw new ORPCError("NOT_FOUND");

    const page = rows.slice(0, THREAD_PAGE_SIZE);
    const { messages, collections } = await toChatMessages(forward ? page : page.toReversed(), me, {
      muted: safety.mute !== null,
      tradeBlocked: safety.tradeBlocked,
    });

    return {
      conversation: {
        id: input.id,
        partner: { ...partner, reputation: reputations.get(partnerId) ?? null },
        request: member.request,
        archived: member.archivedAt !== null,
        muted: toMuted(member.mutedUntil, now),
        lastReadMessageId: member.lastReadMessageId,
        /** the viewer's own chat mute, shown in place of the message box */
        sendBlocked: safety.mute,
        /** whether the viewer blocked this account; never whether they were blocked */
        blockedByMe: safety.blockedByMe,
      },
      messages,
      hasMore: rows.length > THREAD_PAGE_SIZE,
      collections,
    };
  }),

  markRead: authed
    .input(markReadInputSchema)
    .handler(async ({ input: { id, upTo }, context: { session } }) => {
      const { changed } = await updateMember(id, session.user.id, (state, lastMessageId) => {
        if (lastMessageId === null) return null;
        const messageId = Math.min(upTo ?? lastMessageId, lastMessageId);
        return messageId > (state.lastReadMessageId ?? 0) ? { type: "read", messageId } : null;
      });
      if (changed) await publishChatChanged([session.user.id], id);
    }),

  archive: authed
    .input(conversationIdInputSchema)
    .handler(async ({ input: { id }, context: { session } }) => {
      await updateMember(id, session.user.id, () => ({ type: "archive" }));
      await publishChatChanged([session.user.id], id);
    }),

  unarchive: authed
    .input(conversationIdInputSchema)
    .handler(async ({ input: { id }, context: { session } }) => {
      await updateMember(id, session.user.id, () => ({ type: "unarchive" }));
      await publishChatChanged([session.user.id], id);
    }),

  mute: authed
    .input(muteInputSchema)
    .handler(async ({ input: { id, until }, context: { session } }) => {
      const now = new Date();
      const mutedUntil =
        until === null
          ? null
          : until === "always"
            ? "infinity"
            : new Date(now.getTime() + MUTE_HOURS[until] * 60 * 60 * 1000).toISOString();
      const { state } = await updateMember(id, session.user.id, () => ({
        type: "mute",
        until: mutedUntil,
      }));
      await publishChatChanged([session.user.id], id);
      return { muted: toMuted(state.mutedUntil, now) };
    }),

  /** Replying accepts too. */
  accept: authed
    .input(conversationIdInputSchema)
    .handler(async ({ input: { id }, context: { session } }) => {
      const { changed } = await updateMember(id, session.user.id, (state) =>
        state.request ? { type: "accept" } : null,
      );
      if (changed) await publishChatChanged([session.user.id], id);
    }),

  /** Archives a request for the recipient only; the sender is never told. */
  decline: authed
    .input(conversationIdInputSchema)
    .handler(async ({ input: { id }, context: { session } }) => {
      const { changed } = await updateMember(id, session.user.id, (state) =>
        state.request ? { type: "decline" } : null,
      );
      if (changed) await publishChatChanged([session.user.id], id);
    }),

  /** Uncached so it is always exact; the conditions are `countsTowardBadge`'s, in its order. */
  unreadCount: authed.handler(async ({ context: { session } }) => {
    const me = session.user.id;
    const result = await db.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count
      FROM conversation_member m
      JOIN conversation c ON c.id = m.conversation_id
      JOIN message last ON last.id = c.last_message_id
      WHERE m.user_id = ${me}
        AND ${visibleIn("inbox", me)}
        AND NOT (m.muted_until IS NOT NULL AND m.muted_until > now())
        AND last.sender_id <> ${me} AND last.id > coalesce(m.last_read_message_id, 0)
    `);
    return result.rows[0]?.count ?? 0;
  }),

  /** Requests waiting on the viewer that hold at least one message from the other member. */
  requestCount: authed.handler(async ({ context: { session } }) => {
    const me = session.user.id;
    const result = await db.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count
      FROM conversation_member m
      JOIN conversation c ON c.id = m.conversation_id
      WHERE m.user_id = ${me}
        AND ${visibleIn("requests", me)}
        AND EXISTS (
          SELECT 1 FROM message msg
          WHERE msg.conversation_id = m.conversation_id AND msg.sender_id <> ${me}
        )
    `);
    return result.rows[0]?.count ?? 0;
  }),

  settings: authed.handler(async ({ context: { session } }) => fetchSettings(session.user.id)),

  setSettings: authed
    .input(setSettingsInputSchema)
    .handler(async ({ input, context: { session } }) => {
      const me = session.user.id;
      const set: Partial<MessageSettings> = {};
      if (input.allow !== undefined) set.allow = input.allow;
      if (input.chatAs !== undefined) {
        const chatAs = input.chatAs?.toLowerCase() ?? null;
        if (chatAs !== null) {
          const linked = await db.$count(
            userAddress,
            and(eq(userAddress.address, chatAs), eq(userAddress.userId, me)),
          );
          if (linked === 0) throw new ORPCError("BAD_REQUEST", { message: "Not your profile" });
        }
        set.chatAs = chatAs;
      }
      if (Object.keys(set).length > 0) {
        await db
          .insert(messagePref)
          .values({ userId: me, ...MESSAGE_PREF_DEFAULTS, ...set })
          .onConflictDoUpdate({ target: messagePref.userId, set });
      }
      return fetchSettings(me);
    }),
};
