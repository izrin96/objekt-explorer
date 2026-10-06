import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { fetchNewer, invalidateChatLists } from "./queries";

/**
 * Archive, mute, accept and decline. Each refreshes the lists and the open thread's state
 * itself, so they work while the socket is down; the nudge that follows finds nothing new.
 */
export function useConversationActions(id: number) {
  const queryClient = useQueryClient();
  const options = {
    onSuccess: () => Promise.all([invalidateChatLists(queryClient), fetchNewer(queryClient, id)]),
    onError: (error: Error) =>
      toastManager.add({ type: "error", title: m.chat_action_error(), description: error.message }),
  };

  return {
    archive: useMutation(orpc.chat.archive.mutationOptions(options)),
    unarchive: useMutation(orpc.chat.unarchive.mutationOptions(options)),
    mute: useMutation(orpc.chat.mute.mutationOptions(options)),
    accept: useMutation(orpc.chat.accept.mutationOptions(options)),
    decline: useMutation(orpc.chat.decline.mutationOptions(options)),
  };
}
