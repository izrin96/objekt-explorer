import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import type { LockListOutput } from "@/lib/server/api/routers/locked-objekts";

export function useBatchLock() {
  const t = useTranslations("actions.lock");

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
  return batchLock;
}
