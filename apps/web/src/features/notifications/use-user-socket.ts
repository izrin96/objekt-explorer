import { userSocketMessageSchema } from "@repo/api/schemas/notification";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { fetchNewer, fetchNewerEverywhere, invalidateChatLists } from "@/features/chat/queries";
import { invalidateOfferLists } from "@/features/offers/queries";
import { currentUserOptions } from "@/features/user/queries";
import { clientEnv } from "@/lib/env/client";
import { useUserSocketLive } from "@/stores/user-socket";

import { notificationKeys } from "./queries";

/** `SESSION_REVOKED_CLOSE_CODE` in `@repo/api/user-socket`, a server-only module */
const SESSION_REVOKED = 4001;
const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 30_000;

function socketUrl(): string {
  const configured = clientEnv.VITE_USER_WEBSOCKET_URL;
  if (configured) return configured;
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/me`;
}

/**
 * The per-user nudge channel: it only says "refetch", so every open also refetches
 * whatever changed while it was down. `useUserSocketLive` says whether it is open.
 */
export function useUserSocket() {
  const queryClient = useQueryClient();
  const router = useRouter();

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
        useUserSocketLive.setState({ live: true });
        refetchNotifications();
        void invalidateChatLists(queryClient);
        void invalidateOfferLists(queryClient);
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
            void invalidateOfferLists(queryClient);
            void fetchNewer(queryClient, message.data.conversationId);
            break;
        }
      });

      socket.addEventListener("close", (event) => {
        if (disposed) return;
        useUserSocketLive.setState({ live: false });
        // a ban ended every session: a retry would only be refused, so the tab signs out instead
        if (event.code === SESSION_REVOKED) {
          void queryClient
            .invalidateQueries({ queryKey: currentUserOptions.queryKey })
            .then(() => router.invalidate());
          return;
        }
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
      useUserSocketLive.setState({ live: false });
    };
  }, [queryClient, router]);
}
