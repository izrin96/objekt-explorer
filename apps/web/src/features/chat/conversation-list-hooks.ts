import { type ChatBox, type ConversationRow, type InboxShow } from "@repo/api/schemas/chat";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { type FocusEvent, type RefObject, useEffect, useRef, useState } from "react";

import { nextDraftId, showsDraft } from "./draft-row";
import { type Kept, nextKept, withKept } from "./kept-row";
import { threadOptions } from "./queries";
import { newestId, threadMessages } from "./thread-cache";

/**
 * Under a chip, the open conversation's row stays where it was after a refetch drops it, until
 * the filter is next applied; it reads its deal from the open thread, which every offer and
 * trade change refreshes. Component state, not a cache write, so the server's list stays the truth.
 */
export function useKeptOpenRow(
  rows: ConversationRow[],
  show: InboxShow,
  filter: string,
  settled: boolean,
) {
  const openId = useParams({ strict: false, select: (params) => params.id });
  const id = openId === undefined ? null : Number(openId);
  const { data } = useInfiniteQuery({ ...threadOptions(id ?? 0), enabled: false });
  const conversation = data?.pages[0]?.conversation;
  // archived or turned into a request from the thread: it has left the Inbox
  const inInbox = !conversation || (!conversation.archived && !conversation.request);
  const [kept, setKept] = useState<Kept<ConversationRow>>(null);
  const next = nextKept(kept, rows, id, show !== "all" && inInbox, filter, settled);
  if (next !== kept) setKept(next);
  const newest = data ? threadMessages(data).at(-1) : undefined;
  // open beside the list, so read; its last message and deal come from the thread
  const live =
    next && conversation
      ? {
          ...next.row,
          deal: conversation.deal,
          muted: conversation.muted,
          unread: false,
          unreadCount: 0,
          last: newest
            ? {
                id: newest.id,
                mine: newest.mine,
                body: newest.body,
                card: newest.card?.kind ?? null,
                offerId: newest.offer?.id ?? null,
                createdAt: newest.createdAt,
                unsent: newest.unsent,
              }
            : next.row.last,
        }
      : undefined;
  return withKept(rows, next, live);
}

export type Draft = { id: number; partner: ConversationRow["partner"] };

/**
 * The open thread while nothing is written in it yet: no list holds it until its first
 * message, so the Inbox shows it at the top until its real row arrives (`draft-row.ts`).
 */
export function useDraftThread(rows: ConversationRow[], box: ChatBox, q: string | undefined) {
  const openId = useParams({ strict: false, select: (params) => params.id });
  const id = openId === undefined ? null : Number(openId);
  // reads the thread pane's query, never fetches it; no conversation has id 0
  const { data } = useInfiniteQuery({ ...threadOptions(id ?? 0), enabled: false });
  const conversation = data?.pages[0]?.conversation;
  const open =
    id !== null && data && conversation
      ? { id, empty: newestId(data) === 0, archived: conversation.archived }
      : null;
  const listed = rows.map((row) => row.id);
  const [draftId, setDraftId] = useState<number | null>(null);
  const next = nextDraftId(draftId, open, listed);
  if (next !== draftId) setDraftId(next);
  if (!open || !conversation || !showsDraft(next, open, listed, box, q)) return null;
  return { id: open.id, partner: conversation.partner } satisfies Draft;
}

/**
 * When the row that held focus leaves the list (archived, declined, accepted), focus moves to
 * the row now in its place, or the last one, or the list when none is left. `onFocus` goes on
 * the list's region.
 */
export function useFocusAfterLeave(
  region: RefObject<HTMLDivElement | null>,
  rows: ConversationRow[],
) {
  const held = useRef<{ id: number; index: number } | null>(null);
  const ids = rows.map((row) => row.id);

  useEffect(() => {
    const previous = held.current;
    if (!previous || ids.includes(previous.id)) return;
    held.current = null;
    // focus already went somewhere on purpose, as a dialog does
    if (document.activeElement && document.activeElement !== document.body) return;
    const next = ids[Math.min(previous.index, ids.length - 1)];
    const target =
      next === undefined
        ? region.current
        : region.current?.querySelector<HTMLElement>(`[data-conversation-link="${next}"]`);
    target?.focus();
  }, [ids.join(","), region]);

  return (event: FocusEvent<HTMLElement>) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>("[data-conversation-row]");
    const id = Number(row?.dataset.conversationRow);
    held.current = row ? { id, index: ids.indexOf(id) } : null;
  };
}
