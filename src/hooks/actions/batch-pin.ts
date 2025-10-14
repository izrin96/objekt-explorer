import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { PinListOutput } from "@/lib/server/api/routers/pins";

export function useBatchPin() {
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
            ...old.filter((item) => tokenIdSet.has(item.tokenId) === false),
          ];
        });
        return { previousPins };
      },
      onSuccess: (_, { tokenIds }) => {
        toast.success(
          tokenIds.length > 1
            ? `${tokenIds.length.toLocaleString()} objekts pinned`
            : "Objekt pinned",
        );
      },
      onError: (_err, { tokenIds, address }, context, { client }) => {
        if (context?.previousPins) {
          client.setQueryData(orpc.pins.list.queryKey({ input: address }), context.previousPins);
        }
        toast.error(
          tokenIds.length > 1
            ? `Error pin ${tokenIds.length.toLocaleString()} objekts`
            : "Error pin objekt",
        );
      },
    }),
  );
  return batchPin;
}
