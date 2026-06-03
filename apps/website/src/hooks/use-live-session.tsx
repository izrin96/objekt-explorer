import type { LiveSession } from "@repo/cosmo/types/live";
import { createContext, type PropsWithChildren, useContext, useMemo } from "react";

type ContextProps = {
  live: LiveSession;
};

const LiveSessionContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<{
  live: LiveSession;
}>;

export function LiveSessionProvider({ children, live }: ProviderProps) {
  const value = useMemo(() => ({ live }), [live]);
  return <LiveSessionContext value={value}>{children}</LiveSessionContext>;
}

export function useLiveSession() {
  const ctx = useContext(LiveSessionContext);
  if (!ctx) throw new Error("useLiveSession must be used within LiveSessionProvider");
  return ctx.live;
}
