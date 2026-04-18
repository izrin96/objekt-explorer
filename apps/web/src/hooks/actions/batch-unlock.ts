import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

import { useObjektSelect } from "../use-objekt-select";

export function useBatchUnlock() {
  const content = useIntlayer("actions");
  const reset = useObjektSelect((a) => a.reset);

  const batchUnlock = useMutation(
    orpc.lockedObjekt.batchUnlock.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        await client.cancelQueries(orpc.lockedObjekt.list.queryOptions({ input: address }));

        const queryKey = orpc.lockedObjekt.list.queryKey({ input: address });
        const snapshot = client.getQueryData(queryKey);

        client.setQueryData(queryKey, (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return old.filter((item) => !tokenIdSet.has(item.tokenId));
        });

        return { snapshot };
      },
      onSuccess: (_, { tokenIds }) => {
        const message =
          tokenIds.length > 1
            ? content.unlock.success_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.unlock.success_single.value;
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
            ? content.unlock.error_multiple({ count: tokenIds.length.toLocaleString() }).value
            : content.unlock.error_single.value;
        toast.error(message);
      },
    }),
  );
  return batchUnlock;
}
