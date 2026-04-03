import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";

export function useBatchLock() {
  const content = useIntlayer("actions");

  const batchLock = useMutation(
    orpc.lockedObjekt.batchLock.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        const previousLocks = client.getQueryData<LockListOutput>(
          orpc.lockedObjekt.list.queryKey({ input: address }),
        );
        client.setQueryData(orpc.lockedObjekt.list.queryKey({ input: address }), (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return [
            ...tokenIds.map((tokenId) => ({ tokenId: String(tokenId) })),
            ...old.filter((item) => !tokenIdSet.has(item.tokenId)),
          ];
        });
        return { previousLocks };
      },
      onSuccess: (_, { tokenIds }) => {
        const message =
          tokenIds.length > 1
            ? content.lock.success_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.lock.success_single.value;
        toast.success(message);
      },
      onError: (_err, { tokenIds, address }, context, { client }) => {
        if (context?.previousLocks) {
          client.setQueryData(
            orpc.lockedObjekt.list.queryKey({ input: address }),
            context.previousLocks,
          );
        }
        const message =
          tokenIds.length > 1
            ? content.lock.error_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.lock.error_single.value;
        toast.error(message);
      },
    }),
  );
  return batchLock;
}
