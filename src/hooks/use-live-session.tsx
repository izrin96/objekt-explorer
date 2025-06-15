"use client";

import { LiveSession } from "@/lib/universal/cosmo/live";
import { PropsWithChildren, createContext, useContext } from "react";

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
  if (!ctx)
    throw new Error("useLiveSession must be used within LiveSessionProvider");
  return ctx.live;
}
