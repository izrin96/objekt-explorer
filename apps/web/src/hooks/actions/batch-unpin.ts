import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { PinListOutput } from "@/lib/server/api/routers/pins";

export function useBatchUnpin() {
  const batchUnpin = useMutation(
    orpc.pins.batchUnpin.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        const previousPins = client.getQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: { address } }),
        );
        client.setQueryData(orpc.pins.list.queryKey({ input: { address } }), (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return old.filter((item) => tokenIdSet.has(item.tokenId) === false);
        });
        return { previousPins };
      },
      onSuccess: (_, { tokenIds }) => {
        toast.success(
          tokenIds.length > 1
            ? `${tokenIds.length.toLocaleString()} objekts unpinned`
            : "Objekt unpinned",
        );
      },
      onError: (_err, { tokenIds, address }, context, { client }) => {
        if (context?.previousPins) {
          client.setQueryData(
            orpc.pins.list.queryKey({ input: { address } }),
            context.previousPins,
          );
        }
        toast.error(
          tokenIds.length > 1
            ? `Error unpin ${tokenIds.length.toLocaleString()} objekts`
            : "Error unpin objekt",
        );
      },
    }),
  );
  return batchUnpin;
}
