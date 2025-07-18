import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";

export function useBatchUnlock() {
  const queryClient = useQueryClient();
  const batchUnlock = useMutation(
    orpc.lockedObjekt.batchUnlock.mutationOptions({
      onMutate: async ({ tokenIds, address }) => {
        // await queryClient.cancelQueries({
        //   queryKey: orpc.lockedObjekt.list.key({ input: address }),
        // });
        const previousLocks = queryClient.getQueryData<LockListOutput>(
          orpc.lockedObjekt.list.queryKey({ input: address }),
        );
        queryClient.setQueryData<LockListOutput>(
          orpc.lockedObjekt.list.queryKey({ input: address }),
          (old = []) => {
            const tokenIdSet = new Set(tokenIds.map(String));
            return old.filter((item) => tokenIdSet.has(item.tokenId) === false);
          },
        );
        return { previousLocks };
      },
      onSuccess: (_, { tokenIds }) => {
        // queryClient.invalidateQueries({
        //   queryKey: orpc.lockedObjekt.list.key({
        //     input: address,
        //   }),
        // });
        toast.success(
          tokenIds.length > 1 ? `${tokenIds.length} objekts unlocked` : "Objekt unlocked",
        );
      },
      onError: (_err, { tokenIds, address }, context) => {
        if (context?.previousLocks) {
          queryClient.setQueryData(
            orpc.lockedObjekt.list.queryKey({ input: address }),
            context.previousLocks,
          );
        }
        toast.error(
          tokenIds.length > 1 ? `Error unlock ${tokenIds.length} objekts` : "Error unlock objekt",
        );
      },
    }),
  );
  return batchUnlock;
}
