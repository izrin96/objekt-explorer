import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { addActionToast } from "@/lib/action-toast";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { refusalOf, refusalText } from "./format";
import { applyUnsent, fetchNewer, invalidateChatLists } from "./queries";

/**
 * Archive, mute, accept and decline. Each refreshes the lists and the open thread's state
 * itself, so they work while the socket is down; the nudge that follows finds nothing new.
 * Archive and decline confirm with an Undo, which restores through `unarchive`: a declined
 * request keeps its `request` flag, so it returns to Requests. `request` is where a restore
 * puts the conversation, for its notice.
 */
export function useConversationActions(id: number, request: boolean) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([invalidateChatLists(queryClient), fetchNewer(queryClient, id)]);
  const onError = (error: Error) => {
    const refusal = refusalOf(error);
    toastManager.add({
      type: "error",
      title: m.chat_action_error(),
      description: refusal ? refusalText(refusal) : undefined,
    });
  };
  const options = { onSuccess: refresh, onError };

  const unarchive = useMutation(orpc.chat.unarchive.mutationOptions(options));
  const confirmThenRefresh =
    (title: () => string, undoable = false) =>
    () => {
      if (undoable) {
        addActionToast(
          { type: "success", title: title() },
          { label: m.chat_undo(), onClick: () => unarchive.mutate({ id }) },
        );
      } else {
        toastManager.add({ type: "success", title: title() });
      }
      return refresh();
    };

  return {
    archive: useMutation(
      orpc.chat.archive.mutationOptions({
        onError,
        onSuccess: confirmThenRefresh(m.chat_toast_archived, true),
      }),
    ),
    unarchive,
    restore: useMutation(
      orpc.chat.unarchive.mutationOptions({
        onError,
        onSuccess: confirmThenRefresh(
          request ? m.chat_toast_restored_requests : m.chat_toast_restored_inbox,
        ),
      }),
    ),
    mute: useMutation(orpc.chat.mute.mutationOptions(options)),
    accept: useMutation(
      orpc.chat.accept.mutationOptions({
        onError,
        onSuccess: confirmThenRefresh(m.chat_toast_accepted),
      }),
    ),
    decline: useMutation(
      orpc.chat.decline.mutationOptions({
        onError,
        onSuccess: confirmThenRefresh(m.chat_toast_declined, true),
      }),
    ),
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
