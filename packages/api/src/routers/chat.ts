import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversation, conversationMember, message, messagePref } from "@repo/db/schema";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";

import {
  isMuted,
  pairKey,
  rateDecision,
  rowUnread,
  sendVerdict,
  startMembers,
  startVerdict,
} from "../lib/chat-rules";
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
  fetchPartners,
  fetchPref,
  findMembership,
  hasLinkedAddress,
  parseCard,
  publishChatChanged,
  lockStarts,
  recentStarts,
  refuse,
  resolveCard,
  resolveTarget,
  toChatMessages,
  updateMember,
} from "../services/chat";
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
    const { recipientId, hidesOwner } = await resolveTarget(input.to);
    const { userLow, userHigh } = pairKey(me, recipientId);
    const [senderHasAddress, pref, safety] = await Promise.all([
      hasLinkedAddress(me),
      fetchPref(recipientId),
      chatSafety(me, recipientId),
    ]);

    const result = await db.transaction(async (tx) => {
      await lockStarts(tx, me);
      const [existing] = await tx
        .select({ id: conversation.id })
        .from(conversation)
        .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
      const rate =
        existing || me === recipientId
          ? ({ ok: true } as const)
          : rateDecision(await recentStarts(tx, me, now), new Date(session.user.createdAt), now);

      const verdict = startVerdict({
        senderId: me,
        recipientId,
        senderHasAddress,
        pref,
        hidesOwner,
        blocked: safety.blocked,
        senderMuted: safety.mute !== null,
        existing: existing !== undefined,
        rate,
      });
      if (!verdict.ok) refuse(verdict.reason, verdict.retryAt);
      if (input.card) refuseSend(safety);

      const card = input.card
        ? await resolveCard(input.card, {
            senderId: me,
            partnerId: recipientId,
            targetListSlug: input.to.kind === "list" ? input.to.slug : null,
          })
        : null;
      if (card) await checkMessageRate(me, now);

      let id = existing?.id;
      let created = false;
      if (id === undefined) {
        const [row] = await tx
          .insert(conversation)
          .values({ userLow, userHigh, createdBy: me })
          .onConflictDoNothing()
          .returning({ id: conversation.id });
        if (row) {
          id = row.id;
          created = true;
          const members = startMembers(card !== null);
          await tx.insert(conversationMember).values([
            { conversationId: id, userId: me, ...members.sender },
            { conversationId: id, userId: recipientId, ...members.recipient },
          ]);
        } else {
          // the other side started it at the same moment
          const [raced] = await tx
            .select({ id: conversation.id })
            .from(conversation)
            .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
          if (!raced) throw new ORPCError("CONFLICT");
          id = raced.id;
        }
      }
      const sent = card ? await appendMessage(tx, id, me, null, card) : null;
      return { id, created, sent: sent !== null };
    });

    if (result.created || result.sent) await publishChatChanged([me, recipientId], result.id);
    return { id: result.id, created: result.created };
  }),

  send: authed.input(sendInputSchema).handler(async ({ input, context: { session } }) => {
    const me = session.user.id;
    const now = new Date();
    const { partnerId } = await findMembership(input.conversationId, me);
    refuseSend(await chatSafety(me, partnerId));
    await checkMessageRate(me, now);
    const card = input.card
      ? await resolveCard(input.card, { senderId: me, partnerId, targetListSlug: null })
      : null;
    const body = input.body ?? null;
    const caution = body === null ? [] : scanMessage(body);

    const sent = await db.transaction((tx) =>
      appendMessage(tx, input.conversationId, me, body, card, caution),
    );
    await publishChatChanged([me, partnerId], input.conversationId);

    const { messages, collections } = await toChatMessages(
      [{ ...sent, senderId: me, body, card, caution }],
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
    const safety = await chatSafety(me, partnerId);
    const partner = partners.get(partnerId);
    if (!member || !partner) throw new ORPCError("NOT_FOUND");

    const page = rows.slice(0, THREAD_PAGE_SIZE);
    const { messages, collections } = await toChatMessages(forward ? page : page.toReversed(), me);

    return {
      conversation: {
        id: input.id,
        partner,
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

  settings: authed.handler(async ({ context: { session } }) => fetchPref(session.user.id)),

  setSettings: authed
    .input(setSettingsInputSchema)
    .handler(async ({ input, context: { session } }) => {
      if (input.allow !== undefined || input.allowHidden !== undefined) {
        await db
          .insert(messagePref)
          .values({ userId: session.user.id, ...MESSAGE_PREF_DEFAULTS, ...input })
          .onConflictDoUpdate({ target: messagePref.userId, set: input });
      }
      return fetchPref(session.user.id);
    }),
};
