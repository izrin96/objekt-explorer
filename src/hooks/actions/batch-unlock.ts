import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";

export function useBatchUnlock() {
  const batchUnlock = useMutation(
    orpc.lockedObjekt.batchUnlock.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        const previousLocks = client.getQueryData<LockListOutput>(
          orpc.lockedObjekt.list.queryKey({ input: address }),
        );
        client.setQueryData(orpc.lockedObjekt.list.queryKey({ input: address }), (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return old.filter((item) => tokenIdSet.has(item.tokenId) === false);
        });
        return { previousLocks };
      },
      onSuccess: (_, { tokenIds }) => {
        toast.success(
          tokenIds.length > 1
            ? `${tokenIds.length.toLocaleString()} objekts unlocked`
            : "Objekt unlocked",
        );
      },
      onError: (_err, { tokenIds, address }, context, { client }) => {
        if (context?.previousLocks) {
          client.setQueryData(
            orpc.lockedObjekt.list.queryKey({ input: address }),
            context.previousLocks,
          );
        }
        toast.error(
          tokenIds.length > 1
            ? `Error unlock ${tokenIds.length.toLocaleString()} objekts`
            : "Error unlock objekt",
        );
      },
    }),
  );
  return batchUnlock;
}
