import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import type { PinListOutput } from "@/lib/server/api/routers/pins";

export function useBatchPin() {
  const content = useIntlayer("actions");

  const batchPin = useMutation(
    orpc.pins.batchPin.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        const previousPins = client.getQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: address }),
        );
        client.setQueryData(orpc.pins.list.queryKey({ input: address }), (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return [
            ...tokenIds.map((tokenId, index) => ({
              tokenId: String(tokenId),
              order: Date.now() + index,
            })),
            ...old.filter((item) => !tokenIdSet.has(item.tokenId)),
          ];
        });
        return { previousPins };
      },
      onSuccess: (_, { tokenIds }) => {
        const message =
          tokenIds.length > 1
            ? content.pin.success_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.pin.success_single.value;
        toast.success(message);
      },
      onError: (_err, { tokenIds, address }, context, { client }) => {
        if (context?.previousPins) {
          client.setQueryData(orpc.pins.list.queryKey({ input: address }), context.previousPins);
        }
        const message =
          tokenIds.length > 1
            ? content.pin.error_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.pin.error_single.value;
        toast.error(message);
      },
    }),
  );
  return batchPin;
}
