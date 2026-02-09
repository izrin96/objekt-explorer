import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";

import { orpc } from "@/lib/orpc/client";

export function useBatchUnlock() {
  const t = useTranslations("actions.unlock");

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
        const key = tokenIds.length > 1 ? "success_multiple" : "success_single";
        toast.success(t(key, { count: tokenIds.length.toLocaleString() }));
      },
      onError: (_err, { tokenIds, address }, context, { client }) => {
        if (context?.previousLocks) {
          client.setQueryData(
            orpc.lockedObjekt.list.queryKey({ input: address }),
            context.previousLocks,
          );
        }
        const key = tokenIds.length > 1 ? "error_multiple" : "error_single";
        toast.error(t(key, { count: tokenIds.length.toLocaleString() }));
      },
    }),
  );
  return batchUnlock;
}
