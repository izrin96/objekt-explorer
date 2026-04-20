import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc/client";

export function useMovePin() {
  const content = useIntlayer("actions");

  const movePin = useMutation(
    orpc.pins.movePin.mutationOptions({
      onMutate: async ({ tokenId, direction, address }, { client }) => {
        await client.cancelQueries(orpc.pins.list.queryOptions({ input: address }));

        const queryKey = orpc.pins.list.queryKey({ input: address });
        const snapshot = client.getQueryData(queryKey);

        client.setQueryData(queryKey, (old = []) => {
          const sorted = old.toSorted((a, b) => a.order - b.order);
          const idx = sorted.findIndex((p) => p.tokenId === String(tokenId));
          if (idx === -1) return old;

          const swapIdx = direction === "down" ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= sorted.length) return old;

          const current = sorted[idx]!;
          const adjacent = sorted[swapIdx]!;
          const tempOrder = current.order;
          current.order = adjacent.order;
          adjacent.order = tempOrder;

          return sorted;
        });

        return { snapshot };
      },
      onSuccess: () => {
        toast.success(content.move_pin.success.value);
      },
      onError: async (_err, { address }, context, { client }) => {
        const queryKey = orpc.pins.list.queryKey({ input: address });

        if (context?.snapshot) {
          client.setQueryData(queryKey, context.snapshot);
        } else {
          await client.invalidateQueries({ queryKey });
        }

        toast.error(content.move_pin.error.value);
      },
    }),
  );
  return movePin;
}
