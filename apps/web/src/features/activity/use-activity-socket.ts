import type { ActivityData } from "@repo/api/schemas/activity";
import { useEffect, useRef } from "react";

import { clientEnv } from "@/lib/env/client";

export type ActivityMessage = {
  type: "transfer" | "history";
  data: ActivityData[];
};

const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 30_000;

function isActivityMessage(value: unknown): value is ActivityMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<ActivityMessage>;
  return (message.type === "transfer" || message.type === "history") && Array.isArray(message.data);
}

function socketUrl(): string {
  const configured = clientEnv.VITE_ACTIVITY_WEBSOCKET_URL;
  if (configured) return configured;
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
}

/**
 * The feed's live half: `VITE_ACTIVITY_WEBSOCKET_URL` when set, else the
 * same-origin `/ws` that `server.ts` serves.
 *
 * `onMessage` is held in a ref: it closes over the current filters and changes
 * on every navigation, and reopening the socket for that would lose the
 * backlog the server replays on connect.
 */
export function useActivitySocket({
  enabled,
  onMessage,
}: {
  enabled: boolean;
  onMessage: (message: ActivityMessage) => void;
}): void {
  const handler = useRef(onMessage);

  useEffect(() => {
    handler.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) return;
    const url = socketUrl();

    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;

    const connect = () => {
      socket = new WebSocket(url);

      socket.addEventListener("open", () => {
        attempt = 0;
        // the server answers with the last batch it published, which fills the
        // gap between the page request and the socket being ready
        socket?.send(JSON.stringify({ type: "request_history" }));
      });

      socket.addEventListener("message", (event: MessageEvent<string>) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }
        if (isActivityMessage(parsed)) handler.current(parsed);
      });

      socket.addEventListener("close", () => {
        if (disposed) return;
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
  }, [enabled]);
}
