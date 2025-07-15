import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";
import { useObjektSelect } from "../use-objekt-select";

export function useBatchUnlock(address: string) {
  const queryClient = useQueryClient();
  const reset = useObjektSelect((a) => a.reset);
  const batchUnlock = useMutation(
    orpc.lockedObjekt.batchUnlock.mutationOptions({
      onMutate: async ({ tokenIds }) => {
        await queryClient.cancelQueries({
          queryKey: orpc.lockedObjekt.list.key({ input: address }),
        });
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
        queryClient.invalidateQueries({
          queryKey: orpc.lockedObjekt.list.key({
            input: address,
          }),
        });
        toast.success(
          tokenIds.length > 1 ? `${tokenIds.length} objekts unlocked` : "Objekt unlocked",
        );
        reset();
      },
      onError: (_err, { tokenIds }, context) => {
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
