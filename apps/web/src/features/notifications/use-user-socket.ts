import { userSocketMessageSchema } from "@repo/api/schemas/notification";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { clientEnv } from "@/lib/env/client";

import { notificationKeys } from "./queries";

const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 30_000;

function socketUrl(): string {
  const configured = clientEnv.VITE_USER_WEBSOCKET_URL;
  if (configured) return configured;
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/me`;
}

/**
 * The per-user nudge channel: it only says "refetch", so every open also refetches
 * whatever changed while it was down. Returns whether it is open.
 */
export function useUserSocket(): boolean {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const url = socketUrl();
    const refetch = () => {
      for (const queryKey of notificationKeys) void queryClient.invalidateQueries({ queryKey });
    };

    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;

    const connect = () => {
      socket = new WebSocket(url);

      socket.addEventListener("open", () => {
        attempt = 0;
        setOpen(true);
        refetch();
      });

      socket.addEventListener("message", (event: MessageEvent<string>) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }
        if (userSocketMessageSchema.safeParse(parsed).success) refetch();
      });

      socket.addEventListener("close", () => {
        if (disposed) return;
        setOpen(false);
        const delay = Math.min(RECONNECT_BASE * 2 ** attempt, RECONNECT_MAX);
        attempt += 1;
        retry = setTimeout(connect, delay);
      });
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [queryClient]);

  return open;
}
