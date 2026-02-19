import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";
import type { PinListOutput } from "@/lib/server/api/routers/pins";

export function useBatchUnpin() {
  const t = useTranslations("actions.unpin");

  const batchUnpin = useMutation(
    orpc.pins.batchUnpin.mutationOptions({
      onMutate: async ({ tokenIds, address }, { client }) => {
        const previousPins = client.getQueryData<PinListOutput>(
          orpc.pins.list.queryKey({ input: address }),
        );
        client.setQueryData(orpc.pins.list.queryKey({ input: address }), (old = []) => {
          const tokenIdSet = new Set(tokenIds.map(String));
          return old.filter((item) => !tokenIdSet.has(item.tokenId));
        });
        return { previousPins };
      },
      onSuccess: (_, { tokenIds }) => {
        const key = tokenIds.length > 1 ? "success_multiple" : "success_single";
        toast.success(t(key, { count: tokenIds.length.toLocaleString() }));
      },
      onError: (_err, { tokenIds, address }, context, { client }) => {
        if (context?.previousPins) {
          client.setQueryData(orpc.pins.list.queryKey({ input: address }), context.previousPins);
        }
        const key = tokenIds.length > 1 ? "error_multiple" : "error_single";
        toast.error(t(key, { count: tokenIds.length.toLocaleString() }));
      },
    }),
  );
  return batchUnpin;
}
