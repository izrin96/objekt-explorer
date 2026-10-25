import { TYPING_PING_MS } from "@repo/api/schemas/chat";
import { useRef } from "react";

import { client } from "@/lib/orpc";

/** At most one "typing" ping per interval; the server decides whether the partner sees it. */
export function useTypingPing(conversationId: number) {
  const lastPing = useRef(0);
  return (next: string) => {
    if (next.trim() === "" || Date.now() - lastPing.current < TYPING_PING_MS) return;
    lastPing.current = Date.now();
    void client.chat.typing({ id: conversationId }).catch(() => undefined);
  };
}
