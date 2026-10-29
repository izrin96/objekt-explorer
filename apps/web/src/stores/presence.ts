import { create } from "zustand";

import { type PresenceMaps, unwatch, watch } from "@/features/presence/watch";

/**
 * The people shown online to this viewer, by user id, and which of them are idle; filled by the
 * tab's one poller.
 */
export const usePresence = create<PresenceMaps>(() => ({ online: {}, idle: {} }));

/** Ids on screen, by how many mounted avatars show each. */
export const watchedIds = new Map<string, number>();
/** When each id last got an answer. */
export const lastChecked = new Map<string, number>();

let generation = 0;
/** Bumped by every reset, so an answer to a request sent before it is dropped. */
export const presenceGeneration = () => generation;

type Poller = { newlyWatched: () => void; checkAll: () => void };
let poller: Poller | null = null;

export function attachPoller(next: Poller) {
  poller = next;
  return () => {
    if (poller === next) poller = null;
  };
}

export function watchPresence(userId: string) {
  if (watch(watchedIds, userId)) poller?.newlyWatched();
}

/** An id off screen forgets its answer, so it never comes back showing a stale dot. */
export function unwatchPresence(userId: string) {
  if (!unwatch(watchedIds, userId)) return;
  lastChecked.delete(userId);
  usePresence.setState((state) => {
    if (!(userId in state.online) && !(userId in state.idle)) return state;
    const { [userId]: _, ...online } = state.online;
    const { [userId]: __, ...idle } = state.idle;
    return { online, idle };
  });
}

/** Forgets every answer, as on sign-out. */
export function resetPresence() {
  generation += 1;
  lastChecked.clear();
  usePresence.setState({ online: {}, idle: {} });
}
