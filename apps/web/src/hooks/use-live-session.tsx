"use client";

import type { LiveSession } from "@repo/cosmo/server/live";

import { createContext, type PropsWithChildren, useContext } from "react";

type ContextProps = {
  live: LiveSession;
};

const LiveSessionContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<{
  live: LiveSession;
}>;

export function LiveSessionProvider({ children, live }: ProviderProps) {
  return <LiveSessionContext value={{ live }}>{children}</LiveSessionContext>;
}

export function useLiveSession() {
  const ctx = useContext(LiveSessionContext);
  if (!ctx) throw new Error("useLiveSession must be used within LiveSessionProvider");
  return ctx.live;
}
