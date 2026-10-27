import type { ChatMessage } from "@repo/api/schemas/chat";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type RefObject, useEffect, useRef, useState } from "react";

import { toastManager } from "@/components/ui/toast";
import {
  catchUpIfBehind,
  fetchNewer,
  invalidateChatLists,
  threadOptions,
} from "@/features/chat/queries";
import { type ThreadData, threadMessages } from "@/features/chat/thread-cache";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
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

/** How close to the bottom still counts as reading the newest message. */
export const STICK_PX = 96;

export const nearEnd = (el: HTMLElement) =>
  el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;

/**
 * Marks what the reader has seen: once per newer message, and only while the page is visible
 * and focused and the thread is scrolled to its newest message. Looks again when any of
 * those becomes true. The scroller is read too, since opening on the New line moves it before
 * a scroll event reaches `atBottom`.
 */
export function useMarkRead(
  id: number,
  newest: ChatMessage | undefined,
  lastReadMessageId: number | null,
  atBottom: boolean,
  scroller: RefObject<HTMLElement | null>,
) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation(
    orpc.chat.markRead.mutationOptions({ onSuccess: () => invalidateChatLists(queryClient) }),
  );
  const marked = useRef(0);
  const upTo = newest && !newest.mine ? newest.id : 0;

  useEffect(() => {
    if (!atBottom || upTo <= Math.max(marked.current, lastReadMessageId ?? 0)) return;
    const mark = () => {
      if (document.hidden || !document.hasFocus() || upTo <= marked.current) return;
      if (scroller.current && !nearEnd(scroller.current)) return;
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
    window.addEventListener("focus", mark);
    return () => {
      document.removeEventListener("visibilitychange", mark);
      window.removeEventListener("focus", mark);
    };
  }, [id, upTo, lastReadMessageId, atBottom, mutate, scroller]);
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
    catchUpIfBehind(queryClient, id);
    document.addEventListener("visibilitychange", catchUp);
    const timer = live ? undefined : setInterval(catchUp, CATCH_UP_MS);
    return () => {
      document.removeEventListener("visibilitychange", catchUp);
      clearInterval(timer);
    };
  }, [queryClient, id, live]);
}

/** How many older pages a jump loads looking for its message before it gives up. */
const JUMP_PAGES = 10;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export type JumpTarget = {
  /** whether a message is the one sought, so one not loaded yet can be looked for */
  has: (message: ChatMessage) => boolean;
  /** the element to scroll to and focus, once its message is drawn */
  selector: string;
};

export type JumpOptions = {
  focus?: boolean;
  /** where the target lands in the view */
  block?: ScrollLogicalPosition;
  /** no smooth scroll, so the view is where it lands before the promise resolves */
  instant?: boolean;
  /** no notice when the message is too far back or a page fails; the caller falls back */
  quiet?: boolean;
};

/**
 * Brings a message into view, loading up to 10 older pages when it isn't drawn yet. Each page
 * calls `markOlder` (the sentinel's `heightBeforeOlder` write), so the reader's place holds while
 * pages prepend, and the thread is read again once at the end, not per page. Stops at a failed
 * page and when the thread closes. Resolves to whether it was found. Review offer, View offer
 * and the New divider go through it.
 */
export function useJumpToMessage({
  id,
  scroller,
  markOlder,
  olderPage,
}: {
  id: number;
  scroller: RefObject<HTMLElement | null>;
  markOlder: () => void;
  olderPage: { fetch: () => Promise<{ failed: boolean }>; resync: () => Promise<unknown> };
}) {
  const queryClient = useQueryClient();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return async (
    target: JumpTarget,
    { focus = true, block = "center", instant = false, quiet = false }: JumpOptions = {},
  ) => {
    const data = () => queryClient.getQueryData<ThreadData>(threadOptions(id).queryKey);
    const held = () => {
      const cached = data();
      return cached ? threadMessages(cached).some(target.has) : false;
    };
    let loaded = 0;
    let failed = false;
    while (!held() && loaded < JUMP_PAGES && data()?.pages.at(-1)?.hasMore) {
      markOlder();
      failed = (await olderPage.fetch()).failed;
      if (failed || !mounted.current) break;
      loaded += 1;
      // the prepended page is drawn, and its place kept, before the next one is measured
      await nextFrame();
    }
    if (!mounted.current) return false;
    if (loaded > 0) void olderPage.resync();
    const found = held();
    let el: HTMLElement | null = null;
    for (let tries = 0; found && !el && tries < 10; tries++) {
      el = scroller.current?.querySelector<HTMLElement>(target.selector) ?? null;
      if (!el) await nextFrame();
    }
    if (!el) {
      if (!quiet) {
        toastManager.add({
          title: failed ? m.common_error_loading_data() : m.chat_jump_too_far(),
        });
      }
      return false;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block, behavior: instant || reduced ? "instant" : "smooth" });
    if (focus) el.focus({ preventScroll: true });
    return true;
  };
}
