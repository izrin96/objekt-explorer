import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";

export function useBatchUnlock() {
  const content = useIntlayer("actions");

  const batchUnlock = useMutation(
    orpc.lockedObjekt.batchUnlock.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        const previousLocks = client.getQueryData<LockListOutput>(
          orpc.lockedObjekt.list.queryKey({ input: address }),
        );
        client.setQueryData(orpc.lockedObjekt.list.queryKey({ input: address }), (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return old.filter((item) => !tokenIdSet.has(item.tokenId));
        });
        return { previousLocks };
      },
      onSuccess: (_, { tokenIds }) => {
        const message =
          tokenIds.length > 1
            ? content.unlock.success_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.unlock.success_single.value;
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
            ? content.unlock.error_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.unlock.error_single.value;
        toast.error(message);
      },
    }),
  );
  return batchUnlock;
}
