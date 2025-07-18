import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { PinListOutput } from "@/lib/server/api/routers/pins";

export function useBatchUnpin() {
  const queryClient = useQueryClient();
  const batchUnpin = useMutation(
    orpc.pins.batchUnpin.mutationOptions({
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
            return old.filter((item) => tokenIdSet.has(item.tokenId) === false);
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
          tokenIds.length > 1 ? `${tokenIds.length} objekts unpinned` : "Objekt unpinned",
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
          tokenIds.length > 1 ? `Error unpin ${tokenIds.length} objekts` : "Error unpin objekt",
        );
      },
    }),
  );
  return batchUnpin;
}
