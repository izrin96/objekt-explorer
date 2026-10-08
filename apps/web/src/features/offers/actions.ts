import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { fetchNewer, invalidateChatLists } from "@/features/chat/queries";
import { orpc } from "@/lib/orpc";
import { isNotFound } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

import { invalidateOfferLists } from "./queries";
import { offerRefusalOf, offerRefusalText, refusedKeys } from "./refusal";

/**
 * Accept, decline, withdraw and cancel, and a wrong copy's accept and decline. Each refreshes
 * the thread and the lists itself, so they work while the socket is down. A refusal also
 * refreshes: it usually means the state moved on. `named` words the objekts a refusal names.
 */
export function useOfferActions(
  conversationId: number,
  named: (keys: ReadonlySet<string>) => string,
) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      fetchNewer(queryClient, conversationId),
      invalidateChatLists(queryClient),
      invalidateOfferLists(queryClient),
    ]);
  const options = {
    onSuccess: refresh,
    onError: (error: Error) => {
      void refresh();
      const refusal = offerRefusalOf(error);
      const keys = refusedKeys(refusal ?? { objektIds: [], collectionSlugs: [] });
      toastManager.add({
        type: "error",
        title:
          (refusal
            ? offerRefusalText(refusal, named(keys) || m.offer_refused_some())
            : isNotFound(error)
              ? m.offer_not_available()
              : null) ?? m.offer_action_error(),
      });
    },
  };

  return {
    accept: useMutation(orpc.offer.accept.mutationOptions(options)),
    decline: useMutation(orpc.offer.decline.mutationOptions(options)),
    withdraw: useMutation(orpc.offer.withdraw.mutationOptions(options)),
    cancelTrade: useMutation(orpc.offer.cancelTrade.mutationOptions(options)),
    acceptSubstitute: useMutation(orpc.offer.acceptSubstitute.mutationOptions(options)),
    declineSubstitute: useMutation(orpc.offer.declineSubstitute.mutationOptions(options)),
  };
}
