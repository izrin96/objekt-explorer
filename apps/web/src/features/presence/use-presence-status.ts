import { useHydrated } from "@tanstack/react-router";
import { useEffect } from "react";

import { unwatchPresence, usePresence, watchPresence } from "@/stores/presence";

type PresenceStatus = "online" | "idle" | null;

/**
 * Whether this person shows as online or idle to the viewer, or neither; watched while the caller
 * is mounted.
 */
export function usePresenceStatus(userId: string | undefined): PresenceStatus {
  const hydrated = useHydrated();
  useEffect(() => {
    if (!userId) return;
    watchPresence(userId);
    return () => unwatchPresence(userId);
  }, [userId]);
  const status = usePresence((state): PresenceStatus => {
    if (!userId || state.online[userId] !== true) return null;
    return state.idle[userId] === true ? "idle" : "online";
  });
  // the server render has no presence, so the first client render matches it
  return hydrated ? status : null;
}
