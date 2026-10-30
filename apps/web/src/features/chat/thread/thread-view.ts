import type { ChatMessage } from "@repo/api/schemas/chat";

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
