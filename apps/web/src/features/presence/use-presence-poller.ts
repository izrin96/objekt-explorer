import { useEffect } from "react";

import { client } from "@/lib/orpc";
import {
  attachPoller,
  lastChecked,
  presenceGeneration,
  resetPresence,
  usePresence,
  watchedIds,
} from "@/stores/presence";

import { applyOnline, chunk, dueIds, PRESENCE_DEBOUNCE_MS, PRESENCE_POLL_MS } from "./watch";

const visible = () => document.visibilityState === "visible";

async function check(userIds: string[]) {
  const generation = presenceGeneration();
  try {
    const { online } = await client.presence.online({ userIds });
    if (generation !== presenceGeneration()) return;
    const now = Date.now();
    for (const id of userIds) lastChecked.set(id, now);
    usePresence.setState((state) => ({ online: applyOnline(state.online, userIds, online) }));
  } catch {
    // a refusal or a failure changes nothing; the next tick asks again
  }
}

function checkIds(ids: string[]) {
  for (const userIds of chunk(ids)) void check(userIds);
}

/**
 * The tab's one presence poller, for a signed-in viewer: every id on screen each 30 s while the
 * tab is in front, ids newly on screen after a short pause, and everything on coming back.
 */
export function usePresencePoller() {
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | undefined;

    const checkAll = () => {
      if (visible()) checkIds([...watchedIds.keys()]);
    };
    const newlyWatched = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (visible()) checkIds(dueIds(watchedIds, lastChecked, Date.now()));
      }, PRESENCE_DEBOUNCE_MS);
    };
    const onVisibility = () => {
      if (visible()) checkAll();
    };

    const detach = attachPoller({ newlyWatched, checkAll });
    const tick = setInterval(checkAll, PRESENCE_POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    // avatars mounted before the poller
    newlyWatched();

    return () => {
      detach();
      clearTimeout(debounce);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
      // a sign-out must not leave the last answers on screen
      resetPresence({ recheck: false });
    };
  }, []);
}
