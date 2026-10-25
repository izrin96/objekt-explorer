import { create } from "zustand";

import type { Attachment } from "@/features/chat/attachment";

type Draft = {
  body: string;
  /** names the message being composed, so a retry of one send never posts it twice */
  clientId: string | null;
};

/**
 * What a conversation's message box holds, by conversation id: a card a Message button hands to
 * the thread it opens, and the text not yet sent. Held in memory only, so a reload or a shared
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

/** An edited message is a different message, so it starts a new send. */
export const setDraftBody = (conversationId: number, body: string) =>
  withDraft(conversationId, body === "" ? null : { body, clientId: null });

/**
 * Begins sending `body`: the send id is the draft's, so a retry of an unedited message keeps it,
 * or a new one. The box is emptied, so typing can go on.
 */
export function beginSend(conversationId: number, body: string) {
  const clientId = useChatDraft.getState().drafts[conversationId]?.clientId ?? crypto.randomUUID();
  withDraft(conversationId, null);
  return { body, clientId };
}

/** A failed send puts its text back ahead of anything typed since, and keeps its id when nothing was. */
export function restoreDraft(conversationId: number, sent: { body: string; clientId: string }) {
  const current = useChatDraft.getState().drafts[conversationId]?.body ?? "";
  withDraft(
    conversationId,
    current === ""
      ? sent
      : { body: sent.body === "" ? current : `${sent.body}\n${current}`, clientId: null },
  );
}
