import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";

export function useBatchLock() {
  const queryClient = useQueryClient();
  const batchLock = useMutation(
    orpc.lockedObjekt.batchLock.mutationOptions({
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
            return [
              ...tokenIds.map((tokenId) => ({ tokenId: String(tokenId), order: 0 })),
              ...old.filter((item) => tokenIdSet.has(item.tokenId) === false),
            ];
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
          tokenIds.length > 1
            ? `${tokenIds.length.toLocaleString()} objekts locked`
            : "Objekt locked",
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
          tokenIds.length > 1
            ? `Error lock ${tokenIds.length.toLocaleString()} objekts`
            : "Error lock objekt",
        );
      },
    }),
  );
  return batchLock;
}
