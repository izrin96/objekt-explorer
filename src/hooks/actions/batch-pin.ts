import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { PinListOutput } from "@/lib/server/api/routers/pins";
import { useObjektSelect } from "../use-objekt-select";

export function useBatchPin(address: string) {
  const queryClient = useQueryClient();
  const reset = useObjektSelect((a) => a.reset);
  const batchPin = useMutation(
    orpc.pins.batchPin.mutationOptions({
      onMutate: async ({ tokenIds }) => {
        await queryClient.cancelQueries({
          queryKey: orpc.pins.list.key({ input: address }),
        });
        const previousPins = queryClient.getQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: address }),
        );
        queryClient.setQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: address }),
          (old = []) => {
            const tokenIdSet = new Set(tokenIds.map(String));
            return [
              ...old.filter((item) => tokenIdSet.has(item.tokenId) === false),
              ...tokenIds.map((tokenId) => ({ tokenId: String(tokenId), order: Date.now() })),
            ];
          },
        );
        return { previousPins };
      },
      onSuccess: (_, { tokenIds }) => {
        queryClient.invalidateQueries({
          queryKey: orpc.pins.list.key({
            input: address,
          }),
        });
        toast.success(tokenIds.length > 1 ? `${tokenIds.length} objekts pinned` : "Objekt pinned");
        reset();
      },
      onError: (_err, { tokenIds }, context) => {
        if (context?.previousPins) {
          queryClient.setQueryData(
            orpc.pins.list.queryKey({ input: address }),
            context.previousPins,
          );
        }
        toast.error(
          tokenIds.length > 1 ? `Error pin ${tokenIds.length} objekts` : "Error pin objekt",
        );
      },
    }),
  );
  return batchPin;
}
