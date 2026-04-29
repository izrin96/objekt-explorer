import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "react-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

import { useObjektSelect } from "../use-objekt-select";

export function useBatchPin() {
  const content = useIntlayer("actions");
  const reset = useObjektSelect((a) => a.reset);

  const batchPin = useMutation(
    orpc.pins.batchPin.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        await client.cancelQueries(orpc.pins.list.queryOptions({ input: address }));

        const queryKey = orpc.pins.list.queryKey({ input: address });
        const snapshot = client.getQueryData(queryKey);

        client.setQueryData(queryKey, (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return [
            ...tokenIds.map((tokenId, index) => ({
              tokenId: String(tokenId),
              order: Date.now() + index,
            })),
            ...old.filter((item) => !tokenIdSet.has(item.tokenId)),
          ];
        });

        return { snapshot };
      },
      onSuccess: (_, { tokenIds }) => {
        const message =
          tokenIds.length > 1
            ? content.pin.success_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.pin.success_single.value;
        toast.success(message);
        reset();
      },
      onError: async (_err, { tokenIds, address }, context, { client }) => {
        const queryKey = orpc.pins.list.queryKey({ input: address });

        if (context?.snapshot) {
          client.setQueryData(queryKey, context.snapshot);
        } else {
          await client.invalidateQueries({ queryKey });
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
