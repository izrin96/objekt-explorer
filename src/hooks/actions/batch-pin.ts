import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { PinListOutput } from "@/lib/server/api/routers/pins";

export function useBatchPin() {
  const queryClient = useQueryClient();
  const batchPin = useMutation(
    orpc.pins.batchPin.mutationOptions({
      onMutate: async ({ tokenIds, address }) => {
        // await queryClient.cancelQueries({
        //   queryKey: orpc.pins.list.key({ input: address }),
        // });
        const previousPins = queryClient.getQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: address }),
        );
        queryClient.setQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: address }),
          (old = []) => {
            const tokenIdSet = new Set(tokenIds.map(String));
            return [
              ...tokenIds.map((tokenId) => ({ tokenId: String(tokenId), order: Date.now() })),
              ...old.filter((item) => tokenIdSet.has(item.tokenId) === false),
            ];
          },
        );
        return { previousPins };
      },
      onSuccess: (_, { tokenIds }) => {
        // queryClient.invalidateQueries({
        //   queryKey: orpc.pins.list.key({
        //     input: address,
        //   }),
        // });
        toast.success(
          tokenIds.length > 1
            ? `${tokenIds.length.toLocaleString()} objekts pinned`
            : "Objekt pinned",
        );
      },
      onError: (_err, { tokenIds, address }, context) => {
        if (context?.previousPins) {
          queryClient.setQueryData(
            orpc.pins.list.queryKey({ input: address }),
            context.previousPins,
          );
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
