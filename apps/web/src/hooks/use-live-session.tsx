"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

import type { LiveSession } from "@/lib/universal/cosmo/live";

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
