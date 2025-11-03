import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc/client";
import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";

export function useBatchLock() {
  const batchLock = useMutation(
    orpc.lockedObjekt.batchLock.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        const previousLocks = client.getQueryData<LockListOutput>(
          orpc.lockedObjekt.list.queryKey({ input: { address } }),
        );
        client.setQueryData(orpc.lockedObjekt.list.queryKey({ input: { address } }), (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return [
            ...tokenIds.map((tokenId) => ({ tokenId: String(tokenId), order: 0 })),
            ...old.filter((item) => tokenIdSet.has(item.tokenId) === false),
          ];
        });
        return { previousLocks };
      },
      onSuccess: (_, { tokenIds }) => {
        toast.success(
          tokenIds.length > 1
            ? `${tokenIds.length.toLocaleString()} objekts locked`
            : "Objekt locked",
        );
      },
      onError: (_err, { tokenIds, address }, context, { client }) => {
        if (context?.previousLocks) {
          client.setQueryData(
            orpc.lockedObjekt.list.queryKey({ input: { address } }),
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
