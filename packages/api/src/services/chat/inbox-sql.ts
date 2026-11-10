import { sql } from "drizzle-orm";

import { isMuted, type searchPatterns } from "../../lib/chat-rules";
import { needsYouSql } from "../../lib/needs-you-sql";
import type { ChatBox, InboxShow } from "../../schemas/chat";
import { notBlockedBy } from "../moderation/safety";

export const BOX_WHERE: Record<ChatBox, ReturnType<typeof sql>> = {
  inbox: sql`m.archived_at IS NULL AND NOT m.request`,
  requests: sql`m.archived_at IS NULL AND m.request`,
  archived: sql`m.archived_at IS NOT NULL`,
};

export const partnerOf = (me: string) =>
  sql`CASE WHEN c.user_low = ${me} THEN c.user_high ELSE c.user_low END`;

export const partnerDeleted = (me: string) =>
  sql`EXISTS (SELECT 1 FROM "user" d WHERE d.id = ${partnerOf(me)} AND d.deleted_at IS NOT NULL)`;

/** Mirrors `visibleBox`, over member `m` of conversation `c`; a deleted account's request is no request. */
export function visibleIn(box: ChatBox, me: string) {
  if (box === "archived") return BOX_WHERE[box];
  const unblocked = sql`${BOX_WHERE[box]} AND ${notBlockedBy(me, partnerOf(me))}`;
  return box === "requests" ? sql`${unblocked} AND NOT ${partnerDeleted(me)}` : unblocked;
}

/** Names and sent cards only; message text is never searched. */
export const matchesSearch = (
  me: string,
  { name, slug }: ReturnType<typeof searchPatterns>,
) => sql`AND (
  EXISTS (SELECT 1 FROM "user" u WHERE u.id = ${partnerOf(me)} AND u.name ILIKE ${name})
  OR EXISTS (SELECT 1 FROM user_address a WHERE a.user_id = ${partnerOf(me)} AND a.nickname ILIKE ${name})
  OR EXISTS (
    SELECT 1 FROM message x
    WHERE x.conversation_id = c.id AND x.card IS NOT NULL AND x.unsent_at IS NULL
      AND x.card->>'collectionSlug' ILIKE ${slug}
  )
)`;

/** The id of the newest message the other member sent and did not unsend: unread is measured by it. */
export const lastIncoming = (me: string) => sql`(
  SELECT max(u.id) FROM message u
  WHERE u.conversation_id = c.id AND u.sender_id <> ${me} AND u.unsent_at IS NULL
)`;

export const notMuted = sql`NOT (m.muted_until IS NOT NULL AND m.muted_until > now())`;

export const hasUnread = (me: string) =>
  sql`${lastIncoming(me)} > coalesce(m.last_read_message_id, 0)`;

export const SHOW_WHERE: Record<
  Exclude<InboxShow, "all">,
  (me: string) => ReturnType<typeof sql>
> = {
  unread: hasUnread,
  "needs-you": needsYouSql,
};

export const toMuted = (mutedUntil: string | null, now: Date) =>
  isMuted(mutedUntil, now)
    ? { until: mutedUntil === "infinity" ? null : new Date(mutedUntil!).toISOString() }
    : null;
