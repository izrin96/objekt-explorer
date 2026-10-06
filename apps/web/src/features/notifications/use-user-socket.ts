import { userSocketMessageSchema } from "@repo/api/schemas/notification";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { fetchNewer, fetchNewerEverywhere, invalidateChatLists } from "@/features/chat/queries";
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
    const refetchNotifications = () => {
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
        refetchNotifications();
        void invalidateChatLists(queryClient);
        void fetchNewerEverywhere(queryClient);
      });

      socket.addEventListener("message", (event: MessageEvent<string>) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }
        const message = userSocketMessageSchema.safeParse(parsed);
        if (!message.success) return;
        switch (message.data.type) {
          case "notifications_changed":
            refetchNotifications();
            // a moderator's mute arrives only as a notification; open threads swap the
            // message box for the mute notice from the conversation state this returns
            void fetchNewerEverywhere(queryClient);
            break;
          case "chat_changed":
            void invalidateChatLists(queryClient);
            void fetchNewer(queryClient, message.data.conversationId);
            break;
        }
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
