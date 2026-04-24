import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "react-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

import { useObjektSelect } from "../use-objekt-select";

export function useBatchLock() {
  const content = useIntlayer("actions");
  const reset = useObjektSelect((a) => a.reset);

  const batchLock = useMutation(
    orpc.lockedObjekt.batchLock.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        await client.cancelQueries(orpc.lockedObjekt.list.queryOptions({ input: address }));

        const queryKey = orpc.lockedObjekt.list.queryKey({ input: address });
        const snapshot = client.getQueryData(queryKey);

        client.setQueryData(queryKey, (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return [
            ...tokenIds.map((tokenId) => ({ tokenId: String(tokenId) })),
            ...old.filter((item) => !tokenIdSet.has(item.tokenId)),
          ];
        });

        return { snapshot };
      },
      onSuccess: (_, { tokenIds }) => {
        const message =
          tokenIds.length > 1
            ? content.lock.success_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.lock.success_single.value;
        toast.success(message);
        reset();
      },
      onError: async (_err, { tokenIds, address }, context, { client }) => {
        const queryKey = orpc.lockedObjekt.list.queryKey({ input: address });

        if (context?.snapshot) {
          client.setQueryData(queryKey, context.snapshot);
        } else {
          await client.invalidateQueries({ queryKey });
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
