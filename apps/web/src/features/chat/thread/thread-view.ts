import type { ChatMessage } from "@repo/api/schemas/chat";

import type { ThreadPage } from "@/features/chat/thread-cache";

type Message = Pick<ChatMessage, "id" | "mine">;

export type OpenedUnread = { lastRead: number; newest: number };

export function newestIncomingId(messages: readonly Message[]) {
  return messages.findLast((message) => !message.mine)?.id;
}

// what was unread when the thread opened; later reads and arrivals never move the line
export function openedUnread(
  messages: readonly Message[],
  lastReadMessageId: number | null | undefined,
): OpenedUnread {
  return { lastRead: lastReadMessageId ?? 0, newest: newestIncomingId(messages) ?? 0 };
}

export function unreadAtOpen(opened: OpenedUnread) {
  return opened.newest > opened.lastRead;
}

/** The id the New divider sits above, or `undefined` when it shows nowhere (yet). */
export function newDividerAt(
  messages: readonly Message[],
  opened: OpenedUnread,
  { olderPages, lost }: { olderPages: boolean; lost: boolean },
) {
  const firstUnread = messages.find(
    (message) => !message.mine && message.id > opened.lastRead && message.id <= opened.newest,
  )?.id;
  // only once the message before it is loaded is this the first unread one
  return unreadAtOpen(opened) &&
    !lost &&
    firstUnread !== undefined &&
    (!olderPages || (messages[0]?.id ?? Infinity) <= opened.lastRead)
    ? firstUnread
    : undefined;
}

export function postOfferOf(messages: readonly Pick<ChatMessage, "card">[], partnerId: string) {
  // the newest card is the partner's post with a match: Make offer adds that post's matches
  const card = messages.findLast((message) => message.card !== null)?.card;
  return card?.kind === "post" && card.match && card.post?.owner.userId === partnerId
    ? {
        matches: { partnerId, post: card.post.list.slug },
        startList: card.post.has ? card.post.list.slug : undefined,
      }
    : {};
}

export type ThreadFooter = "deleted" | "muted" | "blocked" | "composer";

export function threadFooter(
  conversation: Pick<ThreadPage["conversation"], "partnerDeleted" | "sendBlocked" | "blockedByMe">,
): ThreadFooter {
  if (conversation.partnerDeleted) return "deleted";
  if (conversation.sendBlocked) return "muted";
  if (conversation.blockedByMe) return "blocked";
  return "composer";
}

/** setTimeout's ceiling, about 24.8 days; a 30-day mute is waited out in two steps. */
const MAX_TIMEOUT = 2 ** 31 - 1;

/**
 * When an open thread next looks at a chat mute, which ends with no nudge: `refresh` reads
 * the thread's state, else the wait only steps toward an end past setTimeout's reach. A mute
 * that ended while the thread sat in the cache is read at once.
 */
export function muteWait(until: string | null, now: number) {
  if (until === null) return null;
  const left = new Date(until).getTime() - now;
  if (Number.isNaN(left)) return null;
  if (left <= 0) return { ms: 0, refresh: true };
  return { ms: Math.min(left + 1000, MAX_TIMEOUT), refresh: left <= MAX_TIMEOUT };
}
