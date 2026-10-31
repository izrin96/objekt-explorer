import { type ReplyQuote, unsentQuote } from "@repo/api/schemas/chat";
import { create } from "zustand";

import type { Attachment } from "@/features/chat/attachment";

/** The message being answered, with its quote as it read when Reply was chosen. */
export type DraftReply = { id: number; quote: ReplyQuote };

type Draft = {
  body: string;
  /** names the message being composed, so a retry of one send never posts it twice */
  clientId: string | null;
  reply: DraftReply | null;
};

/** The reply of each send in flight, by send id, for a failure to put back after the thread unmounted. */
export const sentReplies = new Map<string, DraftReply>();

/**
 * Conversations whose open thread has a card in its box. The card itself is the thread's state,
 * gone when it unmounts, so a failed send reads this to tell whether a card was attached since.
 */
export const boxCards = new Set<number>();

/**
 * What a conversation's message box holds, by conversation id: a card a Message button hands to
 * the thread it opens, and the text not yet sent with the message it replies to. Held in memory only, so a reload or a shared
 * link never brings either back.
 */
export const useChatDraft = create<{
  cards: Record<number, Attachment>;
  drafts: Record<number, Draft>;
}>(() => ({ cards: {}, drafts: {} }));

const withNewSend = (drafts: Record<number, Draft>, conversationId: number) => {
  const draft = drafts[conversationId];
  return draft ? { ...drafts, [conversationId]: { ...draft, clientId: null } } : drafts;
};

/** `keepSendId` is for a failed send putting its own card back; any other card makes a different message. */
export const putDraftCard = (conversationId: number, card: Attachment, keepSendId = false) =>
  useChatDraft.setState((state) => ({
    cards: { ...state.cards, [conversationId]: card },
    drafts: keepSendId ? state.drafts : withNewSend(state.drafts, conversationId),
  }));

/** Attaching or removing a card makes a different message, so it starts a new send. */
export const dropDraftSendId = (conversationId: number) =>
  useChatDraft.setState((state) => ({ drafts: withNewSend(state.drafts, conversationId) }));

export const dropDraftCard = (conversationId: number) =>
  useChatDraft.setState((state) => {
    const { [conversationId]: _, ...cards } = state.cards;
    return { cards };
  });

const withDraft = (conversationId: number, draft: Draft | null) =>
  useChatDraft.setState((state) => {
    const { [conversationId]: _, ...rest } = state.drafts;
    return { drafts: draft === null ? rest : { ...rest, [conversationId]: draft } };
  });

const draftOf = (conversationId: number) => useChatDraft.getState().drafts[conversationId];

/** An edited message is a different message, so it starts a new send; a reply outlives an emptied box. */
export const setDraftBody = (conversationId: number, body: string) => {
  const reply = draftOf(conversationId)?.reply ?? null;
  withDraft(conversationId, body === "" && reply === null ? null : { body, clientId: null, reply });
};

/** Choosing, changing or stopping a reply makes a different message, so it starts a new send. */
export const setDraftReply = (conversationId: number, reply: DraftReply | null) => {
  const body = draftOf(conversationId)?.body ?? "";
  withDraft(conversationId, body === "" && reply === null ? null : { body, clientId: null, reply });
};

/**
 * Begins sending `body`: the send id is the draft's, so a retry of an unedited message keeps it,
 * or a new one. The box and its reply are emptied, so typing can go on.
 */
export function beginSend(conversationId: number, body: string) {
  const draft = draftOf(conversationId);
  const clientId = draft?.clientId ?? crypto.randomUUID();
  const reply = draft?.reply ?? null;
  if (reply) sentReplies.set(clientId, reply);
  withDraft(conversationId, null);
  return { body, clientId, reply };
}

/**
 * A failed send puts its text back ahead of anything typed since, with its reply and its card
 * unless another was started or attached meanwhile, and keeps its id only when nothing was typed,
 * started or attached. A reply or card added and removed meanwhile leaves nothing behind, so the
 * failed one comes back.
 */
export function restoreDraft(
  conversationId: number,
  sent: { body: string; clientId: string; reply: DraftReply | null; card?: Attachment | null },
) {
  const current = draftOf(conversationId);
  const body = current?.body ?? "";
  const newer = current?.reply ?? null;
  const newerCard = boxCards.has(conversationId);
  withDraft(
    conversationId,
    body === "" && newer === null && !newerCard
      ? { body: sent.body, clientId: sent.clientId, reply: sent.reply }
      : {
          body: body === "" ? sent.body : sent.body === "" ? body : `${sent.body}\n${body}`,
          clientId: null,
          reply: newer ?? sent.reply,
        },
  );
  if (sent.card && !newerCard) putDraftCard(conversationId, sent.card, true);
}

/** Quotes of messages unsent since, in drafts and sends in flight, lose their text and card. */
export function markRepliesUnsent(ids: ReadonlySet<number>) {
  const blank = (reply: DraftReply): DraftReply =>
    ids.has(reply.id) ? { id: reply.id, quote: unsentQuote(reply.quote) } : reply;
  for (const [clientId, reply] of sentReplies) sentReplies.set(clientId, blank(reply));
  useChatDraft.setState((state) => {
    const hit = Object.entries(state.drafts).filter(
      ([, draft]) => draft.reply && ids.has(draft.reply.id),
    );
    if (hit.length === 0) return state;
    const drafts = { ...state.drafts };
    for (const [key, draft] of hit) drafts[Number(key)] = { ...draft, reply: blank(draft.reply!) };
    return { drafts };
  });
}
