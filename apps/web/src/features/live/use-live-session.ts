import type { LiveSession } from "@repo/cosmo/types/live";
import { createContext, use } from "react";

export const LiveSessionContext = createContext<LiveSession | null>(null);

export function useLiveSession(): LiveSession {
  const live = use(LiveSessionContext);
  if (!live) throw new Error("useLiveSession must be used within LiveSessionProvider");
  return live;
}
