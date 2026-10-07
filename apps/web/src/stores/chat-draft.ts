import { create } from "zustand";

import type { Attachment } from "@/features/chat/attachment";

/**
 * A card a Message button hands to the thread it opens, by conversation id. Held in memory only,
 * so a reload or a shared link never attaches it again.
 */
export const useChatDraft = create<{ cards: Record<number, Attachment> }>(() => ({ cards: {} }));

export const putDraftCard = (conversationId: number, card: Attachment) =>
  useChatDraft.setState((state) => ({ cards: { ...state.cards, [conversationId]: card } }));

export const dropDraftCard = (conversationId: number) =>
  useChatDraft.setState((state) => {
    const { [conversationId]: _, ...cards } = state.cards;
    return { cards };
  });
