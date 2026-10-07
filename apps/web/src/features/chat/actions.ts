import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { refusalOf, refusalText } from "./format";
import { applyUnsent, fetchNewer, invalidateChatLists } from "./queries";

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

/** Unsends one of the viewer's messages in `id`, blanking it here before the nudge arrives. */
export function useUnsendMessage(id: number) {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.chat.unsend.mutationOptions({
      onSuccess: (_, { messageId }) => {
        applyUnsent(queryClient, id, messageId);
        return invalidateChatLists(queryClient);
      },
      onError: (error) => {
        const refusal = refusalOf(error);
        toastManager.add({
          type: "error",
          title: refusal ? refusalText(refusal) : m.chat_unsend_error(),
        });
      },
    }),
  );
}
