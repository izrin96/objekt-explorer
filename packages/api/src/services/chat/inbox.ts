import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversationMember, message, offer } from "@repo/db/schema";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import type * as z from "zod";

import { rowUnread, searchPatterns } from "../../lib/chat-rules";
import { HOUR_MS } from "../../lib/time";
import { publishNotify } from "../../realtime";
import {
  CONVERSATION_PAGE_SIZE,
  type ConversationRow,
  type listConversationsInputSchema,
  MUTE_HOURS,
  type muteInputSchema,
  cardKinds,
  splitCards,
  THREAD_PAGE_SIZE,
  type threadInputSchema,
  UNREAD_COUNT_CAP,
} from "../../schemas/chat";
import { dealOf } from "../../schemas/chat-deal";
import { loadIdentities } from "../account/identities";
import { toPublicUser } from "../profile";
import { reputationOf } from "../reputation";
import { hydrateCards, hydratePostCards, parseCard } from "./cards";
import { readDeals } from "./deal";
import {
  SHOW_WHERE,
  lastIncoming,
  matchesSearch,
  partnerOf,
  toMuted,
  visibleIn,
} from "./inbox-sql";
import { findMembership, updateMember } from "./members";
import { toChatMessages } from "./messages";
import { publishChatChanged } from "./notify";
import { chatSafety } from "./safety";
import { activityBetween } from "./settings";

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
  context_card: unknown;
  unread_count: number;
};

/** How many of a conversation's newest messages the row's context card is looked for in. */
const CONTEXT_SCAN = 200;

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
 * The viewer's rows of the conversations `scope` picks, newest activity first. A conversation
 * joins the list with its first message, so a Message click that sends nothing lists nothing.
 */
async function selectConversationRows(me: string, scope: ReturnType<typeof sql>, limit: number) {
  const result = await db.execute<ConversationListRow>(sql`
    SELECT page.*, ctx.card AS context_card, (
      -- \`message_conversation_id_idx\` walks only the unread tail, at most the cap
      SELECT count(*)::int FROM (
        SELECT 1 FROM message u
        WHERE u.conversation_id = page.id AND u.sender_id <> ${me} AND u.unsent_at IS NULL
          AND u.id > coalesce(page.last_read_message_id, 0)
        LIMIT ${UNREAD_COUNT_CAP}
      ) unread
    ) AS unread_count
    FROM (
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
      AND c.last_message_id IS NOT NULL
      ${scope}
    ORDER BY coalesce(c.last_message_at, c.created_at) DESC, c.id DESC
    LIMIT ${limit}
    ) page
    -- after the LIMIT, so only the page's rows look; a card further back than the recent
    -- messages isn't worth walking a long text-only history for
    LEFT JOIN LATERAL (
      SELECT x.card FROM (
        SELECT card, unsent_at FROM message
        WHERE conversation_id = page.id
        ORDER BY id DESC
        LIMIT ${CONTEXT_SCAN}
      ) x
      WHERE x.card IS NOT NULL AND x.unsent_at IS NULL
      LIMIT 1
    ) ctx ON true
    ORDER BY page.active_at::timestamptz DESC, page.id DESC
  `);
  return result.rows;
}

async function toConversationRows(me: string, page: ConversationListRow[]) {
  const now = new Date();
  const contexts = page.map((row) => parseCard(row.context_card));
  const split = splitCards(contexts);
  const [partners, objekts, posts, deals] = await Promise.all([
    fetchPartners(page.map((row) => row.partner_id)),
    hydrateCards(split.objekts, me),
    hydratePostCards(split.posts, me),
    readDeals(
      me,
      page.map((row) => row.id),
    ),
  ]);
  const collections = { ...objekts.collections, ...posts.collections };
  const items = page.flatMap((row, i): ConversationRow[] => {
    const partner = partners.get(row.partner_id);
    if (!partner || row.message_id === null || row.sender_id === null || row.created_at === null) {
      return [];
    }
    const context = cardKinds(contexts[i] ?? null);
    const lastCard = cardKinds(row.unsent ? null : parseCard(row.card));
    const last = { id: Number(row.message_id), senderId: row.sender_id, createdAt: row.created_at };
    const lastRead = row.last_read_message_id === null ? null : Number(row.last_read_message_id);
    const incoming =
      row.incoming_id === null ? null : { id: Number(row.incoming_id), senderId: row.partner_id };
    return [
      {
        id: row.id,
        partner,
        last: {
          id: last.id,
          mine: last.senderId === me,
          body: row.unsent ? null : row.body,
          card: lastCard.objekt ? "objekt" : lastCard.post ? "post" : null,
          offerId: row.offer_id,
          createdAt: new Date(last.createdAt).toISOString(),
          unsent: row.unsent === true,
        },
        context: context.objekt
          ? objekts.view(context.objekt)
          : context.post
            ? posts.view(context.post)
            : null,
        unread: rowUnread({ request: row.request, lastReadMessageId: lastRead }, incoming, me),
        request: row.request,
        archived: row.archived_at !== null,
        muted: toMuted(row.muted_until, now),
        unreadCount: row.request ? 0 : row.unread_count,
        deal: dealOf(deals.get(row.id) ?? [], me, now),
      },
    ];
  });
  return { items, collections };
}

export async function listConversations(
  me: string,
  { box, cursor, q, show }: z.infer<typeof listConversationsInputSchema>,
) {
  const patterns = q === undefined ? null : searchPatterns(q);
  const rows = await selectConversationRows(
    me,
    sql`AND ${visibleIn(box, me)}
      ${patterns ? matchesSearch(me, patterns) : sql``}
      ${box === "inbox" && show !== "all" ? sql`AND ${SHOW_WHERE[show](me)}` : sql``}
      ${cursor ? sql`AND (coalesce(c.last_message_at, c.created_at), c.id) < (${cursor.at}::timestamptz, ${cursor.id})` : sql``}`,
    CONVERSATION_PAGE_SIZE + 1,
  );
  const page = rows.slice(0, CONVERSATION_PAGE_SIZE);
  const { items, collections } = await toConversationRows(me, page);

  const lastRow = page.at(-1);
  return {
    items,
    collections,
    nextCursor:
      rows.length > CONVERSATION_PAGE_SIZE && lastRow
        ? { at: lastRow.active_at, id: lastRow.id }
        : null,
  };
}

/**
 * The row the list shows the viewer for one conversation, in whichever box it sits; null
 * when none of their boxes lists it. `collections` draws its context card.
 */
export async function loadConversationRow(me: string, id: number) {
  const [row] = await selectConversationRows(
    me,
    sql`AND c.id = ${id}
      AND (${visibleIn("inbox", me)} OR ${visibleIn("requests", me)} OR ${visibleIn("archived", me)})`,
    1,
  );
  if (!row) return null;
  const { items, collections } = await toConversationRows(me, [row]);
  const item = items[0];
  return item ? { row: item, collections } : null;
}

/**
 * At most 50 messages, oldest first: the newest page, the page before `before`, or
 * the messages after `after`. `hasMore` is about the direction asked for.
 */
export async function loadThread(me: string, input: z.infer<typeof threadInputSchema>) {
  const { partnerId } = await findMembership(input.id, me);
  const now = new Date();

  const forward = input.after !== undefined;
  const older = input.before !== undefined;
  const [rows, [member], partners, safety, reputations, deals, anyOffer] = await Promise.all([
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
        replyToId: message.replyToId,
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
    chatSafety(me, partnerId),
    reputationOf([partnerId]),
    // the cache keeps only the newest page's `conversation`, so an older page skips the deal
    older ? null : readDeals(me, [input.id]),
    older
      ? []
      : db.select({ id: offer.id }).from(offer).where(eq(offer.conversationId, input.id)).limit(1),
  ]);
  const activity = await activityBetween(input.id, me, partnerId, safety.blockedEitherWay);
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
      /** the account was deleted: the thread stays readable and nothing more can be sent */
      partnerDeleted: safety.partnerDeleted,
      deal: dealOf(deals?.get(input.id) ?? [], me, now),
      /** picks "No offer between you yet" or "No open offer" when there is no deal */
      hadOffer: anyOffer.length > 0,
    },
    messages,
    hasMore: rows.length > THREAD_PAGE_SIZE,
    collections,
  };
}

export async function markConversationRead(me: string, id: number, upTo: number | undefined) {
  const { changed, state } = await updateMember(id, me, (state, lastMessageId) => {
    if (lastMessageId === null) return null;
    const messageId = Math.min(upTo ?? lastMessageId, lastMessageId);
    return messageId > (state.lastReadMessageId ?? 0) ? { type: "read", messageId } : null;
  });
  if (!changed) return;
  const { partnerId } = await findMembership(id, me);
  // the partner's open thread moves its Seen only when the reader's Seen reaches them
  const { toPartner } = await activityBetween(id, me, partnerId);
  const readTo = state.lastReadMessageId;
  await Promise.all([
    publishChatChanged([me], id),
    toPartner && readTo !== null
      ? publishNotify(partnerId, { type: "chat_seen", conversationId: id, upTo: readTo })
      : null,
  ]);
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
