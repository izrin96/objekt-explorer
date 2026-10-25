import { TYPING_SHOWN_MS } from "@repo/api/schemas/chat";
import { create } from "zustand";

/** Conversations whose other member is typing, each cleared after `TYPING_SHOWN_MS` of quiet. */
export const useChatTyping = create<{ typing: Record<number, true> }>(() => ({ typing: {} }));

const timers = new Map<number, ReturnType<typeof setTimeout>>();

export function clearTyping(conversationId: number) {
  clearTimeout(timers.get(conversationId));
  timers.delete(conversationId);
  useChatTyping.setState((state) => {
    if (!(conversationId in state.typing)) return state;
    const { [conversationId]: _, ...typing } = state.typing;
    return { typing };
  });
}

export function showTyping(conversationId: number) {
  clearTimeout(timers.get(conversationId));
  timers.set(
    conversationId,
    setTimeout(() => clearTyping(conversationId), TYPING_SHOWN_MS),
  );
  useChatTyping.setState((state) => ({ typing: { ...state.typing, [conversationId]: true } }));
}
