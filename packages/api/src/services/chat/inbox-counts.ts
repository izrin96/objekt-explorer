import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { needsYouSql } from "../../lib/needs-you-sql";
import { UNREAD_COUNT_CAP } from "../../schemas/chat";
import { hasUnread, lastIncoming, notMuted, visibleIn } from "./inbox-sql";

/** Uncached so it is always exact; the conditions are `countsTowardBadge`'s, in its order. */
export async function unreadConversationCount(me: string) {
  const result = await db.execute<{ count: number }>(sql`
    SELECT count(*)::int AS count
    FROM conversation_member m
    JOIN conversation c ON c.id = m.conversation_id
    WHERE m.user_id = ${me}
      AND ${visibleIn("inbox", me)}
      AND ${notMuted}
      AND ${hasUnread(me)}
  `);
  return result.rows[0]?.count ?? 0;
}

/**
 * The Inbox's Unread and Needs you counts, over the whole Inbox and each capped like the row's
 * count. Muted conversations count toward neither, as toward the Messages icon.
 */
export async function inboxCounts(me: string) {
  const count = (where: ReturnType<typeof sql>) => sql`(
    SELECT count(*)::int FROM (
      SELECT 1 FROM conversation_member m
      JOIN conversation c ON c.id = m.conversation_id
      WHERE m.user_id = ${me} AND c.last_message_id IS NOT NULL
        AND ${visibleIn("inbox", me)} AND ${notMuted} AND ${where}
      LIMIT ${UNREAD_COUNT_CAP}
    ) x
  )`;
  const result = await db.execute<{ unread: number; needs_you: number }>(sql`
    SELECT ${count(hasUnread(me))} AS unread, ${count(needsYouSql(me))} AS needs_you
  `);
  const row = result.rows[0];
  return { unread: row?.unread ?? 0, needsYou: row?.needs_you ?? 0 };
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

export async function hasUnseenRequests(me: string) {
  const result = await db.execute<{ unseen: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM conversation_member m
      JOIN conversation c ON c.id = m.conversation_id
      WHERE m.user_id = ${me}
        AND ${visibleIn("requests", me)}
        AND ${lastIncoming(me)} > coalesce(
          (SELECT p.requests_seen_message_id FROM message_pref p WHERE p.user_id = ${me}), 0)
    ) AS unseen
  `);
  return result.rows[0]?.unseen ?? false;
}

/** The newest id is read in the same statement as the write, so a request arriving meanwhile stays unseen. */
export async function seeRequests(me: string) {
  await db.execute(sql`
    INSERT INTO message_pref (user_id, requests_seen_message_id)
    SELECT ${me}, max(incoming.id)
    FROM (
      SELECT ${lastIncoming(me)} AS id
      FROM conversation_member m
      JOIN conversation c ON c.id = m.conversation_id
      WHERE m.user_id = ${me} AND ${visibleIn("requests", me)}
    ) incoming
    HAVING max(incoming.id) IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE
    SET requests_seen_message_id = greatest(
      coalesce(message_pref.requests_seen_message_id, 0), excluded.requests_seen_message_id)
  `);
}
