import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import type { PinListOutput } from "@/lib/server/api/routers/pins";

export function useBatchUnpin() {
  const content = useIntlayer("actions");

  const batchUnpin = useMutation(
    orpc.pins.batchUnpin.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        const previousPins = client.getQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: address }),
        );
        client.setQueryData(orpc.pins.list.queryKey({ input: address }), (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return old.filter((item) => !tokenIdSet.has(item.tokenId));
        });
        return { previousPins };
      },
      onSuccess: (_, { tokenIds }) => {
        const message =
          tokenIds.length > 1
            ? content.unpin.success_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.unpin.success_single.value;
        toast.success(message);
      },
      onError: (_err, { tokenIds, address }, context, { client }) => {
        if (context?.previousPins) {
          client.setQueryData(orpc.pins.list.queryKey({ input: address }), context.previousPins);
        }
        const message =
          tokenIds.length > 1
            ? content.unpin.error_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.unpin.error_single.value;
        toast.error(message);
      },
    }),
  );
  return batchUnpin;
}
