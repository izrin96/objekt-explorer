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
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.lockedObjekt.list.key({
            input: address,
          }),
        });
        toast.success("Objekt unlocked");
        reset();
      },
      onError: (_err, _variables, context) => {
        if (context?.previousLocks) {
          queryClient.setQueryData(
            orpc.lockedObjekt.list.queryKey({ input: address }),
            context.previousLocks,
          );
        }
        toast.error("Error unlock objekt");
      },
    }),
  );
  return batchUnlock;
}
