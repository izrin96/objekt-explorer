import { SESSION_REVOKED_CODE, realtimeEventSchema } from "@repo/api/schemas/realtime";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { disconnectedCodes } from "centrifuge";
import { useEffect } from "react";

import {
  applyChatMessage,
  applyUnsent,
  fetchNewer,
  fetchNewerEverywhere,
  invalidateChatLists,
  syncUnsentEverywhere,
} from "@/features/chat/queries";
import { invalidateOfferLists } from "@/features/offers/queries";
import { currentUserOptions } from "@/features/user/queries";
import { acquireRealtime, realtime } from "@/lib/realtime";
import { showTyping } from "@/stores/chat-typing";
import { useUserSocketLive } from "@/stores/user-socket";

import { notificationKeys } from "./queries";

/**
 * The per-user channel on the tab's one connection. Events carry what changed, a chat message
 * its content, so a tab refetches only when it cannot be sure it heard everything: on its first
 * connect, or after a drop longer than the server keeps events. `useUserSocketLive` says
 * whether it is subscribed.
 */
export function useUserSocket() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const connection = realtime();
    const refetchNotifications = () => {
      for (const queryKey of notificationKeys) void queryClient.invalidateQueries({ queryKey });
    };
    const refetchAll = () => {
      refetchNotifications();
      void invalidateChatLists(queryClient);
      void invalidateOfferLists(queryClient);
      void fetchNewerEverywhere(queryClient);
      void syncUnsentEverywhere(queryClient);
    };

    const onSubscribed = (ctx: { wasRecovering: boolean; recovered: boolean }) => {
      useUserSocketLive.setState({ live: true });
      // a gap the server replayed arrives as publications; anything else may have missed events
      if (!(ctx.wasRecovering && ctx.recovered)) refetchAll();
    };

    const onPublication = (ctx: { data: unknown }) => {
      const event = realtimeEventSchema.safeParse(ctx.data);
      if (!event.success) return;
      switch (event.data.type) {
        case "notifications_changed":
          refetchNotifications();
          // a moderator's mute arrives only as a notification; open threads swap the
          // message box for the mute notice from the conversation state this returns
          void fetchNewerEverywhere(queryClient);
          break;
        case "chat_message":
          applyChatMessage(queryClient, event.data);
          break;
        case "chat_changed":
          void invalidateChatLists(queryClient);
          void invalidateOfferLists(queryClient);
          void fetchNewer(queryClient, event.data.conversationId);
          break;
        case "chat_typing":
          showTyping(event.data.conversationId);
          break;
        case "chat_unsent":
          applyUnsent(queryClient, event.data.conversationId, event.data.messageId);
          void invalidateChatLists(queryClient);
          break;
      }
    };

    const onDown = () => useUserSocketLive.setState({ live: false });

    const onDisconnected = (ctx: { code: number }) => {
      onDown();
      // a ban, or a refused renewal, ended every session: a retry would only be refused, so
      // the tab signs out instead
      if (ctx.code !== SESSION_REVOKED_CODE && ctx.code !== disconnectedCodes.unauthorized) return;
      void queryClient
        .invalidateQueries({ queryKey: currentUserOptions.queryKey })
        .then(() => router.invalidate());
    };

    connection.on("subscribed", onSubscribed);
    connection.on("publication", onPublication);
    connection.on("connecting", onDown);
    connection.on("disconnected", onDisconnected);
    const release = acquireRealtime({ signedIn: true });

    return () => {
      connection.removeListener("subscribed", onSubscribed);
      connection.removeListener("publication", onPublication);
      connection.removeListener("connecting", onDown);
      connection.removeListener("disconnected", onDisconnected);
      release();
      useUserSocketLive.setState({ live: false });
    };
  }, [queryClient, router]);
}
