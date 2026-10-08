import type { ChatMessage } from "@repo/api/schemas/chat";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { fetchNewer, invalidateChatLists } from "@/features/chat/queries";
import { orpc } from "@/lib/orpc";
import { useUserSocketLive } from "@/stores/user-socket";

/** How often an open thread asks for newer messages while the socket is down. */
const CATCH_UP_MS = 10_000;

/** setTimeout's ceiling, about 24.8 days; a 30-day mute is waited out in two steps. */
const MAX_TIMEOUT = 2 ** 31 - 1;

/** A chat mute ends on its own, with no nudge: refresh the thread's state when it does. */
export function useMuteEnd(id: number, until: string | null) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (until === null) return;
    const left = new Date(until).getTime() - Date.now();
    if (!(left > 0)) return;
    const timer = setTimeout(
      () => {
        if (left > MAX_TIMEOUT) setStep((value) => value + 1);
        else void fetchNewer(queryClient, id);
      },
      Math.min(left + 1000, MAX_TIMEOUT),
    );
    return () => clearTimeout(timer);
  }, [id, until, step, queryClient]);
}

/** Marks what the reader has seen, once per newer message and only while the tab is visible. */
export function useMarkRead(
  id: number,
  newest: ChatMessage | undefined,
  lastReadMessageId: number | null,
) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation(
    orpc.chat.markRead.mutationOptions({ onSuccess: () => invalidateChatLists(queryClient) }),
  );
  const marked = useRef(0);
  const upTo = newest && !newest.mine ? newest.id : 0;

  useEffect(() => {
    if (upTo <= Math.max(marked.current, lastReadMessageId ?? 0)) return;
    const mark = () => {
      if (document.hidden || upTo <= marked.current) return;
      const previous = marked.current;
      // held while in flight so it is not sent twice; a failure lets the next look retry
      marked.current = upTo;
      mutate(
        { id, upTo },
        {
          onError: () => {
            if (marked.current === upTo) marked.current = previous;
          },
        },
      );
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [id, upTo, lastReadMessageId, mutate]);
}

/**
 * New messages reach an open thread as a socket nudge. Without the socket nothing would
 * arrive until a reload, so the thread polls then, and always catches up when shown again.
 */
export function useCatchUp(id: number) {
  const queryClient = useQueryClient();
  const live = useUserSocketLive((state) => state.live);

  useEffect(() => {
    const catchUp = () => {
      if (document.hidden) return;
      void fetchNewer(queryClient, id).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", catchUp);
    const timer = live ? undefined : setInterval(catchUp, CATCH_UP_MS);
    return () => {
      document.removeEventListener("visibilitychange", catchUp);
      clearInterval(timer);
    };
  }, [queryClient, id, live]);
}
