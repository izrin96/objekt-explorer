import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversationMember, message } from "@repo/db/schema";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import type * as z from "zod";

import { isMuted, rowUnread } from "../../lib/chat-rules";
import { HOUR_MS } from "../../lib/time";
import {
  CONVERSATION_PAGE_SIZE,
  type ChatBox,
  type ConversationRow,
  type listConversationsInputSchema,
  MUTE_HOURS,
  type muteInputSchema,
  THREAD_PAGE_SIZE,
  type threadInputSchema,
} from "../../schemas/chat";
import { loadIdentities } from "../identities";
import { toPublicUser } from "../profile";
import { reputationOf } from "../reputation";
import { notBlockedBy } from "../safety";
import { parseCard, toChatMessages } from "./cards";
import { findMembership, updateMember } from "./members";
import { publishChatChanged } from "./notify";
import { chatSafety } from "./safety";
import { activityBetween } from "./settings";

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
  unsent: boolean | null;
  created_at: string | null;
  incoming_id: string | null;
};

/** The id of the newest message the other member sent and did not unsend: unread is measured by it. */
const lastIncoming = (me: string) => sql`(
  SELECT max(u.id) FROM message u
  WHERE u.conversation_id = c.id AND u.sender_id <> ${me} AND u.unsent_at IS NULL
)`;

const toMuted = (mutedUntil: string | null, now: Date) =>
  isMuted(mutedUntil, now)
    ? { until: mutedUntil === "infinity" ? null : new Date(mutedUntil!).toISOString() }
    : null;

/** Each account as a conversation heads it, with its avatar. */
export async function fetchPartners(userIds: string[]) {
  const identities = await loadIdentities(userIds);
  return new Map(
    [...identities].map(([userId, { account, identity }]) => [
      userId,
      { userId, user: toPublicUser(account), identity },
    ]),
  );
}

/**
 * Newest activity first. A conversation with no message yet is listed only for the one
 * who started it, so an empty request never reaches the recipient.
 */
export async function listConversations(
  me: string,
  { box, cursor }: z.infer<typeof listConversationsInputSchema>,
) {
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
      msg.unsent_at IS NOT NULL AS unsent,
      msg.created_at::text AS created_at,
      ${lastIncoming(me)} AS incoming_id
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
    const lastRead = row.last_read_message_id === null ? null : Number(row.last_read_message_id);
    const incoming =
      row.incoming_id === null ? null : { id: Number(row.incoming_id), senderId: row.partner_id };
    return [
      {
        id: row.id,
        partner,
        last: last && {
          id: last.id,
          mine: last.senderId === me,
          body: row.unsent ? null : row.body,
          card: row.unsent ? null : parseCard(row.card),
          offerId: row.offer_id,
          createdAt: new Date(last.createdAt).toISOString(),
          unsent: row.unsent === true,
        },
        unread: rowUnread({ request: row.request, lastReadMessageId: lastRead }, incoming, me),
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
}

/**
 * At most 50 messages, oldest first: the newest page, the page before `before`, or
 * the messages after `after`. `hasMore` is about the direction asked for.
 */
export async function loadThread(me: string, input: z.infer<typeof threadInputSchema>) {
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
        unsentAt: message.unsentAt,
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
  const [safety, reputations, activity] = await Promise.all([
    chatSafety(me, partnerId),
    reputationOf([partnerId]),
    activityBetween(input.id, me, partnerId),
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
      /** how far the partner has read, when their Seen reaches the viewer */
      partnerReadMessageId: activity.toViewer ? activity.partnerReadMessageId : null,
      /** the viewer's own chat mute, shown in place of the message box */
      sendBlocked: safety.mute,
      /** whether the viewer blocked this account; never whether they were blocked */
      blockedByMe: safety.blockedByMe,
    },
    messages,
    hasMore: rows.length > THREAD_PAGE_SIZE,
    collections,
  };
}

export async function markConversationRead(me: string, id: number, upTo: number | undefined) {
  const { changed } = await updateMember(id, me, (state, lastMessageId) => {
    if (lastMessageId === null) return null;
    const messageId = Math.min(upTo ?? lastMessageId, lastMessageId);
    return messageId > (state.lastReadMessageId ?? 0) ? { type: "read", messageId } : null;
  });
  if (!changed) return;
  const { partnerId } = await findMembership(id, me);
  // the partner's open thread moves its Seen only when the reader's Seen reaches them
  const { toPartner } = await activityBetween(id, me, partnerId);
  await publishChatChanged(toPartner ? [me, partnerId] : [me], id);
}

export async function muteConversation(me: string, { id, until }: z.infer<typeof muteInputSchema>) {
  const now = new Date();
  const mutedUntil =
    until === null
      ? null
      : until === "always"
        ? "infinity"
        : new Date(now.getTime() + MUTE_HOURS[until] * HOUR_MS).toISOString();
  const { state } = await updateMember(id, me, () => ({ type: "mute", until: mutedUntil }));
  await publishChatChanged([me], id);
  return { muted: toMuted(state.mutedUntil, now) };
}

/** Replying accepts too. */
export async function acceptConversation(me: string, id: number) {
  const { changed } = await updateMember(id, me, (state) =>
    state.request ? { type: "accept" } : null,
  );
  if (!changed) return;
  // accepting lets the sender's thread show this account's Seen and typing
  const { partnerId } = await findMembership(id, me);
  await publishChatChanged([me, partnerId], id);
}

/** Uncached so it is always exact; the conditions are `countsTowardBadge`'s, in its order. */
export async function unreadConversationCount(me: string) {
  const result = await db.execute<{ count: number }>(sql`
    SELECT count(*)::int AS count
    FROM conversation_member m
    JOIN conversation c ON c.id = m.conversation_id
    WHERE m.user_id = ${me}
      AND ${visibleIn("inbox", me)}
      AND NOT (m.muted_until IS NOT NULL AND m.muted_until > now())
      AND ${lastIncoming(me)} > coalesce(m.last_read_message_id, 0)
  `);
  return result.rows[0]?.count ?? 0;
}

/** Requests waiting on the viewer that hold at least one message from the other member. */
export async function requestConversationCount(me: string) {
  const result = await db.execute<{ count: number }>(sql`
    SELECT count(*)::int AS count
    FROM conversation_member m
    JOIN conversation c ON c.id = m.conversation_id
    WHERE m.user_id = ${me}
      AND ${visibleIn("requests", me)}
      AND EXISTS (
        SELECT 1 FROM message msg
        WHERE msg.conversation_id = m.conversation_id AND msg.sender_id <> ${me}
          AND msg.unsent_at IS NULL
      )
  `);
  return result.rows[0]?.count ?? 0;
}
