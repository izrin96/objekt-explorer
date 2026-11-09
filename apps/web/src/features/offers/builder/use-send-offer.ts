import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { fetchNewer, invalidateChatLists } from "@/features/chat/queries";
import { itemLabel } from "@/features/offers/format";
import type { Collections, OfferPick } from "@/features/offers/pick";
import { invalidateOfferLists } from "@/features/offers/queries";
import { offerRefusalOf, offerRefusalText, refusedKeys } from "@/features/offers/refusal";
import { orpc } from "@/lib/orpc";
import { joinList } from "@/lib/text";
import { m } from "@/paraglide/messages";

import type { SendFailure } from "./refused";

/** The send mutation with the failure it leaves: the text to show and the picks it named. */
export function useSendOffer({
  onSent,
  give,
  get,
  estimatedOf,
  collections,
}: {
  /** the offer is in the conversation, which the caller goes to once `ready` settles */
  onSent: (conversationId: number, ready: Promise<unknown>) => void;
  give: readonly OfferPick[];
  get: readonly OfferPick[];
  estimatedOf: (pick: OfferPick) => boolean;
  collections: Collections;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<SendFailure | null>(null);
  const [refused, setRefused] = useState<ReadonlySet<string>>(new Set());
  const create = useMutation(
    orpc.offer.create.mutationOptions({
      onSuccess: async ({ conversationId }) => {
        // the thread's loader reads its cache as it stands, so the new offer is in it first; the
        // offer is sent whatever these do, so a failed one never reads as a failed send
        const ready = Promise.allSettled([
          invalidateChatLists(queryClient),
          invalidateOfferLists(queryClient),
          fetchNewer(queryClient, conversationId),
        ]);
        onSent(conversationId, ready);
        // still pending meanwhile, so Send stays disabled
        await ready;
      },
      onError: (failure) => {
        const refusal = offerRefusalOf(failure);
        if (!refusal) {
          setError({ text: m.offer_send_error(), remove: false, link: false });
          return;
        }
        const keys = refusedKeys(refusal);
        const named = joinList(
          [...give, ...get]
            .filter((pick) => keys.has(pick.key))
            .map((pick) => itemLabel({ ...pick, serialEstimated: estimatedOf(pick) }, collections)),
        );
        setRefused(keys);
        const text =
          offerRefusalText(refusal, named || m.offer_refused_some()) ?? m.offer_send_error();
        // here the way out is taking the named objekts out of the offer
        setError({ text, remove: named !== "", link: refusal.reason === "no_address" });
      },
    }),
  );

  const clearFailure = () => {
    setError(null);
    setRefused(new Set());
  };

  return { create, error, refused, clearFailure };
}
