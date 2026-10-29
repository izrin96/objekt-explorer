import { useHydrated } from "@tanstack/react-router";
import { useEffect } from "react";

import { unwatchPresence, usePresence, watchPresence } from "@/stores/presence";

/** Whether this person shows as online to the viewer; watched while the caller is mounted. */
export function useOnline(userId: string | undefined) {
  const hydrated = useHydrated();
  useEffect(() => {
    if (!userId) return;
    watchPresence(userId);
    return () => unwatchPresence(userId);
  }, [userId]);
  const online = usePresence((state) => (userId ? state.online[userId] === true : false));
  // the server render has no presence, so the first client render matches it
  return hydrated && online;
}
