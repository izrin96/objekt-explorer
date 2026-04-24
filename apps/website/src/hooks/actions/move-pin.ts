import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "react-intlayer";
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

          const currentOrder = sorted[idx]!.order;
          const adjacentOrder = sorted[swapIdx]!.order;

          return sorted.map((item, i) => {
            if (i === idx) return Object.assign({}, item, { order: adjacentOrder });
            if (i === swapIdx) return Object.assign({}, item, { order: currentOrder });
            return item;
          });
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
