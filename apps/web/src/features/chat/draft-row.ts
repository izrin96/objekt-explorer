import type { ChatBox } from "@repo/api/schemas/chat";

/** The thread open beside the list, once its first page is loaded. */
export type OpenThread = { id: number; empty: boolean; archived: boolean };

/**
 * The conversation the Inbox keeps a "New message" row for. An open empty thread takes it, and
 * keeps it past the first send until the list's own row arrives, so the row hands over instead
 * of blinking out; after that it is forgotten, so archiving the conversation brings nothing back.
 */
export function nextDraftId(remembered: number | null, open: OpenThread | null, listed: number[]) {
  if (open?.empty) return open.id;
  if (remembered !== null && listed.includes(remembered)) return null;
  return remembered;
}

export function showsDraft(
  draftId: number | null,
  open: OpenThread | null,
  listed: number[],
  box: ChatBox,
  q: string | undefined,
) {
  return (
    box === "inbox" &&
    q === undefined &&
    open !== null &&
    open.id === draftId &&
    !open.archived &&
    !listed.includes(open.id)
  );
}
